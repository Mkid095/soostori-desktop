/**
 * sale-create-handlers.ts — Sale creation IPC handler (host path).
 *
 * Cycle 04 Sub-cycle F: after the SQLite INSERT succeeds, enqueue a
 * SyncEvent onto `defaultSyncEngine` so the LAN/cloud sync layer sees
 * the new sale. This is the Desktop side of the production sync smoke.
 *
 * Phase 04: capability enforcement — sales.create required before committing.
 */

import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'
import { saleCreateSchema } from './validation'
import { commitSale } from '../sdk/sale-orchestrator'
import { pushSale } from '../services/cloud-entity-sync'
import { syncService } from '../sync/sync-service'
import { notify } from '../services/notification-service'
import { resolveActiveShopId } from '../database/active-shop'
import { desktopLoadSession } from '../auth/electron-store-session'
import type { Sale, SyncEvent } from '@soostori/contracts'
import { asBusinessId, asEmployeeId, asDeviceId, type SyncCursorId } from '@soostori/core'
import { fromLocalSale, type SalesRow } from '../database/contracts-mapper-2'
import { buildSaleSyncEvent, buildDebtSyncEvent } from '../database/sync-event-builder'
// Phase 04: canonical capability API
import { can, CAPABILITIES } from '@soostori/auth'
import type { Member } from '@soostori/auth'
import type { EmployeeRole } from '@soostori/core'
import { getRealSyncEngine } from '../sync/sync-engine'
import { CloudClient } from '@soostori/cloud'
import { getSyncStore } from '../services/store'

const db = getDatabase()

/** Build a Member for the capability system from the session's employeeId. */
function getCallerMember(session: { employeeId: string }): Member {
  const row = db.prepare('SELECT role FROM employees WHERE id = ?').get(session.employeeId) as { role: string } | undefined
  return { role: (row?.role ?? 'cashier') as EmployeeRole }
}

export function registerSaleCreateHandlers(): void {
  ipcMain.handle('db:sales:create', async (_event, rawSaleData: unknown) => {
    const saleData = saleCreateSchema.parse(rawSaleData)
    const shopId = (saleData as { shopId?: string }).shopId || await resolveActiveShopId()
    const userId = (saleData as { userId?: string }).userId || 'system'
    const deviceId = (saleData as { deviceId?: string }).deviceId || null
    const saleId = uuidv4()

    // Phase 04: capability enforcement — caller must have sales.create
    const session = await desktopLoadSession()
    if (!session) throw new Error('Not authenticated')
    if (!can(getCallerMember(session), CAPABILITIES.SALES_CREATE)) {
      throw new Error('Insufficient permissions: sales.create required')
    }

    // Client mode: send to host via LAN for authorization
    if (syncService.getMode() === 'client') {
      syncService.sendSalePending({
        saleId, total: saleData.totalAmount || 0,
        paymentMethod: saleData.paymentMethod || 'cash',
        items: (saleData.items || []).map(i => ({ productId: i.productId || '', quantity: i.quantity })),
      })
      return { id: saleId, status: 'pending', total_amount: saleData.totalAmount, payment_method: 'pending' }
    }

    // Host/Offline path
    try {
      await commitSale({
        saleId, userId, deviceId: deviceId || '',
        items: (saleData.items || []).map(i => ({
          productId: i.productId || '', productName: i.productName, quantity: i.quantity,
          unitPrice: i.unitPrice || 0, discount: i.discount,
          totalPrice: i.totalPrice || (i.quantity * (i.unitPrice || 0)), variationName: i.variationName,
        })),
        paymentMethod: (saleData.paymentMethod || 'cash') as 'cash' | 'mobile_money' | 'card' | 'transfer' | 'debt',
        paidAmount: saleData.paidAmount || saleData.totalAmount || 0,
        discountAmount: saleData.discountAmount, taxAmount: saleData.taxAmount,
        note: saleData.note, customerId: saleData.customerId, customerName: saleData.customerName,
        customerIdNumber: saleData.customerIdNumber,
      })

      // Low-stock notifications via SDK engine (scoped to current shop)
      for (const item of saleData.items || []) {
        if (!item.productId) continue
        const product = db.prepare(
          'SELECT name, current_stock, track_inventory, low_stock_threshold FROM products WHERE id = ? AND shop_id = ?',
        ).get(item.productId, shopId) as { name: string; current_stock: number; track_inventory: number | null; low_stock_threshold: number | null } | undefined
        if (product?.track_inventory && product?.low_stock_threshold != null &&
            product.current_stock <= product.low_stock_threshold && product.current_stock >= 0) {
          notify('stock.low', {
            productName: product.name,
            currentStock: product.current_stock,
            threshold: product.low_stock_threshold,
            productId: item.productId,
          }, shopId).catch(() => {})
        }
      }

      // Debt record — stamp shop_id from active session
      if (saleData.paymentMethod === 'debt') {
        let customerId = saleData.customerId || null
        if (!customerId && (saleData.customerName || saleData.customerPhone)) {
          const custId = uuidv4()
          getDatabase().prepare(
            `INSERT INTO customers (id, name, phone, shop_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
          ).run(custId, saleData.customerName || 'Unknown', saleData.customerPhone || null, shopId,
            new Date().toISOString(), new Date().toISOString())
          customerId = custId
        }
        if (customerId) {
          const debtId = uuidv4()
          const debtKey = `debt:created:${debtId}`
          getDatabase().prepare(
            `INSERT INTO debts (id, customer_id, sale_id, amount, amount_paid, status, notes, shop_id, created_at, updated_at, version, idempotency_key) VALUES (?, ?, ?, ?, 0, 'pending', ?, ?, ?, ?, 1, ?)`,
          ).run(debtId, customerId, saleId, saleData.totalAmount, saleData.note || null, shopId,
            new Date().toISOString(), new Date().toISOString(), debtKey)

          // Phase 11: enqueue DebtCreated sync event so other devices/cloud receive it
          const debtRow = getDatabase().prepare(
            'SELECT * FROM debts WHERE id = ?'
          ).get(debtId)
          if (debtRow) {
            const debtEvent = buildDebtSyncEvent('create', {
              id: debtId,
              businessId: asBusinessId(shopId),
              customerId: customerId as import('@soostori/core').CustomerId,
              saleId: saleId as import('@soostori/core').SaleId,
              amount: saleData.totalAmount,
              balance: saleData.totalAmount,
              status: 'pending',
              dueDate: null,
              notes: saleData.note ?? null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              version: 1,
            } as import('@soostori/contracts').Debt, {
              businessId: asBusinessId(shopId),
              originatingDeviceId: asDeviceId(session?.deviceId ?? deviceId ?? 'system'),
              originatingEmployeeId: asEmployeeId(session?.userId ?? userId),
              clientSequence: Date.now() + 1,
            })
            getRealSyncEngine().enqueue(debtEvent).catch(() => {})
          }
        }
      }

      // Sub-cycle F: enqueue SyncEvent onto RealSyncEngine after the
      // SQLite INSERT succeeds. Projects the persisted row to the
      // canonical Sale shape via fromLocalSale so the sync payload is
      // contract-typed.
      const saleRow = db.prepare(
        'SELECT * FROM sales WHERE id = ? AND shop_id = ?',
      ).get(saleId, shopId) as SalesRow | undefined
      if (saleRow) {
        const sale: Sale = fromLocalSale(saleRow)
        const syncEvent: SyncEvent = buildSaleSyncEvent(sale, {
          businessId: asBusinessId(sale.businessId),
          originatingDeviceId: asDeviceId(session?.deviceId ?? deviceId ?? 'system'),
          originatingEmployeeId: asEmployeeId(session?.userId ?? userId),
          clientSequence: Date.now(),
        })
        // Phase 09: CRITICAL FIX — use RealSyncEngine (persisted to SQLite),
        // not the NoOp stub. RealSyncEngine.enqueue() writes to sync_events
        // table with idempotency_key dedup; cloud pull reads from there.
        getRealSyncEngine().enqueue(syncEvent).catch(() => {})

        // Phase 05: trigger immediate cloud pull to receive any pending events
        const appId = process.env.INSTANT_APP_ID
        if (appId) {
          const token = getSyncStore().get('cloudToken') as string | undefined
          const cloud = new CloudClient({ appId, token })
          const engine = getRealSyncEngine()
          engine.setCloudClient(cloud)
          const cursorId = `cursor-${shopId}` as SyncCursorId
          const cursor = {
            cursorId,
            deviceId: asDeviceId(session?.deviceId ?? deviceId ?? 'local'),
            businessId: asBusinessId(shopId),
            lastServerReceivedAt: null,
            lastOriginatingDeviceId: null,
            lastClientSequence: null,
            lastSyncAt: new Date().toISOString(),
          }
          engine.pull(cursor).then(events => {
            if (events.length > 0) {
              log.info(`Sale create: received ${events.length} cloud events`)
              events.forEach(e => engine.apply(null, e))
            }
          }).catch(() => {})
        }
      }

      log.info(`Sale committed via SDK: ${saleId}, total: ${saleData.totalAmount}`)
      pushSale(saleId).catch(() => {})
      db.prepare(`INSERT INTO audit_logs (id, shop_id, user_id, device_id, action, entity_type, entity_id, payload, created_at) VALUES (?, ?, ?, ?, 'sale_completed', 'sale', ?, ?, datetime('now'))`)
        .run(uuidv4(), shopId, userId, deviceId || null, saleId, JSON.stringify({ total: saleData.totalAmount }))

      // Notify via @soostori/notifications engine — flows to in-app channel and beyond
      notify('sale.confirmed', {
        saleId,
        total: saleData.totalAmount,
      }, shopId).catch(() => {})

      return { id: saleId, status: 'completed', total_amount: saleData.totalAmount, payment_method: saleData.paymentMethod }
    } catch (err: unknown) {
      const error = err as { code?: string; message: string }
      if (error.code === 'STOCK_AUTHORIZATION_ERROR') {
        throw Object.assign(new Error(`Sale denied: ${error.message}`), { code: 'SALE_REJECTED' })
      }
      throw err
    }
  })

  log.info('Sale create IPC handlers registered')
}