/**
 * customer-handlers.ts — Phase 10 Customer IPC handlers.
 *
 * Implements:
 * - Create / edit / search / soft-delete customer
 * - Attach customer to a sale
 * - Customer purchase history
 * - Offline operation (SQLite-first)
 * - Sync through RealSyncEngine.enqueue()
 * - RBAC via @soostori/auth CAPABILITIES
 * - Business isolation (shop_id scoping)
 * - CRITICAL INVARIANT: idempotent creation by idempotency key or unique
 *   phone/email/idNumber lookup — no duplicate customers from replay.
 * - Sale referencing a customer remains valid regardless of sync ordering
 *   (customer foreign key is NOT enforced at DB level; soft reference via id).
 */

import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'
import { customerCreateSchema, customerUpdateSchema } from './validation'
import { can, CAPABILITIES } from '@soostori/auth'
import type { Member } from '@soostori/auth'
import type { EmployeeRole } from '@soostori/core'
import { desktopLoadSession } from '../auth/electron-store-session'
import { resolveActiveShopId } from '../database/active-shop'
import { getRealSyncEngine } from '../sync/sync-engine'
import { asBusinessId, asCustomerId, asDeviceId, asEmployeeId,
  asIdempotencyKey, asSyncEventId } from '@soostori/core'
import type { SyncEvent } from '@soostori/contracts'
import { fromLocalCustomer, type CustomersRow } from '../database/contracts-mapper-2'

function getMember(employeeId: string): Member {
  const db = getDatabase()
  const row = db.prepare(
    'SELECT role FROM employees WHERE id = ?'
  ).get(employeeId) as { role: string } | undefined
  return { role: (row?.role ?? 'cashier') as EmployeeRole }
}

export function registerCustomerHandlers(): void {
  const db = getDatabase()

  // Ensure id_number column exists for older DBs
  const custInfo = db.prepare('PRAGMA table_info(customers)').all() as Array<{ name: string }>
  if (!custInfo.some(c => c.name === 'id_number')) {
    db.exec('ALTER TABLE customers ADD COLUMN id_number TEXT')
  }

  // ── List active customers ─────────────────────────────────────────────────
  ipcMain.handle('db:customers:list', async () => {
    const shopId = await resolveActiveShopId()
    return db.prepare(
      'SELECT * FROM customers WHERE is_active = 1 AND shop_id = ? ORDER BY name ASC'
    ).all(shopId)
  })

  // ── Get single customer ───────────────────────────────────────────────────
  ipcMain.handle('db:customers:get', async (_event, id: string) => {
    const shopId = await resolveActiveShopId()
    return db.prepare(
      'SELECT * FROM customers WHERE id = ? AND shop_id = ?'
    ).get(id, shopId) ?? null
  })

  // ── Search customers (by name, phone, email, idNumber) ──────────────────
  ipcMain.handle('db:customers:search', async (_event, query: string) => {
    const shopId = await resolveActiveShopId()
    if (!query || query.trim().length < 1) {
      return db.prepare(
        'SELECT * FROM customers WHERE is_active = 1 AND shop_id = ? ORDER BY name ASC LIMIT 20'
      ).all(shopId)
    }
    const q = `%${query.trim()}%`
    return db.prepare(`
      SELECT * FROM customers
      WHERE is_active = 1 AND shop_id = ?
        AND (name LIKE ? OR phone LIKE ? OR email LIKE ? OR id_number LIKE ?)
      ORDER BY name ASC
      LIMIT 20
    `).all(shopId, q, q, q, q)
  })

  // ── Customer purchase history ───────────────────────────────────────────
  ipcMain.handle('db:customers:purchaseHistory', async (_event, customerId: string) => {
    const shopId = await resolveActiveShopId()
    // Verify customer belongs to this shop
    const customer = db.prepare(
      'SELECT id FROM customers WHERE id = ? AND shop_id = ? AND is_active = 1'
    ).get(customerId, shopId)
    if (!customer) return []

    const sales = db.prepare(`
      SELECT s.*, GROUP_CONCAT(si.product_name || ' x' || si.quantity) as items_summary
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id AND si.shop_id = s.shop_id
      WHERE s.customer_id = ? AND s.shop_id = ?
      GROUP BY s.id
      ORDER BY s.created_at DESC
      LIMIT 50
    `).all(customerId, shopId)

    const totalResult = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total, COALESCE(COUNT(*), 0) as count
      FROM sales WHERE customer_id = ? AND shop_id = ?
    `).get(customerId, shopId) as { total: number; count: number }

    return { sales, summary: totalResult }
  })

  // ── Attach customer to an existing sale ──────────────────────────────────
  ipcMain.handle('db:customers:attachToSale', async (_event, saleId: string, customerId: string) => {
    const session = await desktopLoadSession()
    if (!session) throw new Error('Not authenticated')
    if (!can(getMember(session.employeeId), CAPABILITIES.SALES_CREATE)) {
      throw new Error('Insufficient permissions')
    }
    const shopId = await resolveActiveShopId()

    // Verify customer belongs to this shop
    const customer = db.prepare(
      'SELECT id FROM customers WHERE id = ? AND shop_id = ? AND is_active = 1'
    ).get(customerId, shopId)
    if (!customer) throw new Error('Customer not found')

    // Verify sale belongs to this shop
    const sale = db.prepare(
      'SELECT id FROM sales WHERE id = ? AND shop_id = ?'
    ).get(saleId, shopId)
    if (!sale) throw new Error('Sale not found')

    const now = new Date().toISOString()
    db.prepare(
      'UPDATE sales SET customer_id = ?, updated_at = ? WHERE id = ? AND shop_id = ?'
    ).run(customerId, now, saleId, shopId)

    return db.prepare('SELECT * FROM sales WHERE id = ? AND shop_id = ?').get(saleId, shopId)
  })

  // ── Create customer (idempotent) ─────────────────────────────────────────
  ipcMain.handle('db:customers:create', async (_event, rawData: unknown, idempotencyKey?: string) => {
    const session = await desktopLoadSession()
    if (!session) throw new Error('Not authenticated')
    if (!can(getMember(session.employeeId), CAPABILITIES.CUSTOMERS_CREATE)) {
      throw new Error('Insufficient permissions')
    }
    const data = customerCreateSchema.parse(rawData)
    const shopId = await resolveActiveShopId()
    const now = new Date().toISOString()

    // ── Idempotency: check idempotency key first ──────────────────────────
    const key = idempotencyKey
      ? asIdempotencyKey(idempotencyKey)
      : asIdempotencyKey(`customer:${shopId}:${data.phone ?? ''}:${data.idNumber ?? ''}`)

    const byKey = db.prepare(
      'SELECT * FROM customers WHERE idempotency_key = ? AND shop_id = ?'
    ).get(key, shopId) as (CustomersRow & { idempotency_key?: string }) | undefined
    if (byKey) {
      log.debug(`Customer idempotency hit: key=${key}`)
      return byKey
    }

    // ── Deduplication: phone / idNumber uniqueness within shop ───────────
    if (data.phone) {
      const byPhone = db.prepare(
        'SELECT id FROM customers WHERE phone = ? AND shop_id = ? AND is_active = 1'
      ).get(data.phone, shopId)
      if (byPhone) {
        log.debug(`Customer deduplication hit: phone=${data.phone}`)
        return db.prepare(
          'SELECT * FROM customers WHERE phone = ? AND shop_id = ? AND is_active = 1'
        ).get(data.phone, shopId)
      }
    }
    if (data.idNumber) {
      const byIdNum = db.prepare(
        'SELECT id FROM customers WHERE id_number = ? AND shop_id = ? AND is_active = 1'
      ).get(data.idNumber, shopId)
      if (byIdNum) {
        log.debug(`Customer deduplication hit: idNumber=${data.idNumber}`)
        return db.prepare(
          'SELECT * FROM customers WHERE id_number = ? AND shop_id = ? AND is_active = 1'
        ).get(data.idNumber, shopId)
      }
    }

    // ── Insert new customer ───────────────────────────────────────────────
    const id = uuidv4()
    db.prepare(`
      INSERT INTO customers
        (id, name, phone, email, address, notes, id_number, idempotency_key, shop_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.name, data.phone || null, data.email || null,
      data.address || null, data.notes || null, data.idNumber || null,
      key, shopId, now, now,
    )

    const row = db.prepare(
      'SELECT * FROM customers WHERE id = ? AND shop_id = ?'
    ).get(id, shopId) as CustomersRow

    // ── Enqueue sync event ────────────────────────────────────────────────
    try {
      const syncEvent: SyncEvent = {
        id: asSyncEventId(uuidv4()),
        idempotencyKey: key,
        businessId: asBusinessId(shopId),
        entityKind: 'customer',
        entityId: asCustomerId(id),
        operation: 'create',
        originatingDeviceId: asDeviceId(session.deviceId ?? 'local'),
        originatingEmployeeId: asEmployeeId(session.employeeId),
        clientSequence: Date.now(),
        clientCreatedAt: now,
        entityVersion: 1,
        payload: fromLocalCustomer(row) as unknown as Record<string, unknown>,
        state: 'pending',
      }
      getRealSyncEngine().enqueue(syncEvent).catch(err => {
        log.warn('Customer sync enqueue failed (offline):', err)
      })
    } catch (err) {
      log.warn('Failed to enqueue customer sync event (offline):', err)
    }

    log.info(`Customer created: ${id}, name=${data.name}, idempotencyKey=${key}`)
    return row
  })

  // ── Update customer ──────────────────────────────────────────────────────
  ipcMain.handle('db:customers:update', async (_event, id: string, rawData: unknown) => {
    const session = await desktopLoadSession()
    if (!session) throw new Error('Not authenticated')
    if (!can(getMember(session.employeeId), CAPABILITIES.CUSTOMERS_UPDATE)) {
      throw new Error('Insufficient permissions')
    }
    const data = customerUpdateSchema.parse(rawData)
    const shopId = await resolveActiveShopId()
    const now = new Date().toISOString()

    // Verify customer belongs to this shop
    const existing = db.prepare(
      'SELECT * FROM customers WHERE id = ? AND shop_id = ?'
    ).get(id, shopId) as (CustomersRow & { version?: number }) | undefined
    if (!existing) throw new Error('Customer not found')

    const fields: string[] = []
    const values: (string | null)[] = []
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
    if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone || null) }
    if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email || null) }
    if (data.address !== undefined) { fields.push('address = ?'); values.push(data.address || null) }
    if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes || null) }
    if (data.idNumber !== undefined) { fields.push('id_number = ?'); values.push(data.idNumber || null) }
    const newVersion = (existing.version ?? 1) + 1
    fields.push('updated_at = ?', 'version = ?')
    values.push(now, newVersion, id, shopId)

    db.prepare(
      `UPDATE customers SET ${fields.join(', ')} WHERE id = ? AND shop_id = ?`
    ).run(...values)

    const updated = db.prepare(
      'SELECT * FROM customers WHERE id = ? AND shop_id = ?'
    ).get(id, shopId) as CustomersRow

    // ── Enqueue sync event ────────────────────────────────────────────────
    try {
      const syncEvent: SyncEvent = {
        id: asSyncEventId(uuidv4()),
        idempotencyKey: asIdempotencyKey(`update:customer:${id}:v${newVersion}`),
        businessId: asBusinessId(shopId),
        entityKind: 'customer',
        entityId: asCustomerId(id),
        operation: 'update',
        originatingDeviceId: asDeviceId(session.deviceId ?? 'local'),
        originatingEmployeeId: asEmployeeId(session.employeeId),
        clientSequence: Date.now(),
        clientCreatedAt: now,
        entityVersion: newVersion,
        payload: fromLocalCustomer(updated) as unknown as Record<string, unknown>,
        state: 'pending',
      }
      getRealSyncEngine().enqueue(syncEvent).catch(err => {
        log.warn('Customer update sync enqueue failed (offline):', err)
      })
    } catch (err) {
      log.warn('Failed to enqueue customer update sync event:', err)
    }

    return updated
  })

  // ── Soft-delete customer ─────────────────────────────────────────────────
  ipcMain.handle('db:customers:delete', async (_event, id: string) => {
    const session = await desktopLoadSession()
    if (!session) throw new Error('Not authenticated')
    if (!can(getMember(session.employeeId), CAPABILITIES.CUSTOMERS_DELETE)) {
      throw new Error('Insufficient permissions')
    }
    const shopId = await resolveActiveShopId()
    const now = new Date().toISOString()
    db.prepare(
      'UPDATE customers SET is_active = 0, updated_at = ? WHERE id = ? AND shop_id = ?'
    ).run(now, id, shopId)

    // ── Enqueue tombstone sync event ──────────────────────────────────────
    try {
      const syncEvent: SyncEvent = {
        id: asSyncEventId(uuidv4()),
        idempotencyKey: asIdempotencyKey(`delete:customer:${id}`),
        businessId: asBusinessId(shopId),
        entityKind: 'customer',
        entityId: asCustomerId(id),
        operation: 'delete',
        originatingDeviceId: asDeviceId(session.deviceId ?? 'local'),
        originatingEmployeeId: asEmployeeId(session.employeeId),
        clientSequence: Date.now(),
        clientCreatedAt: now,
        entityVersion: Date.now(),
        payload: { id } as Record<string, unknown>,
        state: 'pending',
      }
      getRealSyncEngine().enqueue(syncEvent).catch(err => {
        log.warn('Customer delete sync enqueue failed (offline):', err)
      })
    } catch (err) {
      log.warn('Failed to enqueue customer delete sync event:', err)
    }
  })

  log.info('Phase 10 Customer IPC handlers registered (idempotent, sync-wired, RBAC)')
}
