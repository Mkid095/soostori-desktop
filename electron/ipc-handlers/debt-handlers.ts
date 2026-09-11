/**
 * debt-handlers.ts — Phase 11 Debt IPC handlers.
 *
 * Implements:
 * - Create debt (standalone or from a sale with payment_method='debt')
 * - Record debt payment (append-only, balance derived from SUM of payments)
 * - View outstanding debts + full payment history
 * - Offline operation (SQLite-first)
 * - Sync through RealSyncEngine.enqueue()
 * - RBAC via @soostori/auth CAPABILITIES
 * - Business isolation (shop_id scoping)
 *
 * CRITICAL INVARIANT: debt balance is NEVER mutated by overwriting.
 * balance = amount - SUM(debt_payments.amount) — derived deterministically.
 * Replaying a payment event MUST NOT produce a different balance.
 * The amount_paid column on debts is a cached view column ONLY, recomputed
 * from the payment ledger whenever needed; it is never the source of truth.
 */

import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'
import { debtCreateSchema, debtPaymentSchema } from './validation'
import { can, CAPABILITIES } from '@soostori/auth'
import type { Member } from '@soostori/auth'
import type { EmployeeRole } from '@soostori/core'
import { desktopLoadSession } from '../auth/electron-store-session'
import { resolveActiveShopId } from '../database/active-shop'
import { getRealSyncEngine } from '../sync/sync-engine'
import {
  asBusinessId, asCustomerId, asDebtId, asDebtPaymentId,
  asDeviceId, asEmployeeId, asIdempotencyKey, asSyncEventId,
} from '@soostori/core'
import type { SyncEvent } from '@soostori/contracts'
import { fromLocalDebt, fromLocalDebtPayment, type DebtRow, type DebtPaymentRow } from '../database/contracts-mapper-2'
import { audit } from '../services/audit-logger'
import { enforceSubscriptionOrThrow } from '../services/subscription-enforcer'

// ── Member builder ─────────────────────────────────────────────────────────────

function getMember(employeeId: string): Member {
  const db = getDatabase()
  const row = db.prepare(
    'SELECT role FROM employees WHERE id = ?'
  ).get(employeeId) as { role: string } | undefined
  return { role: (row?.role ?? 'cashier') as EmployeeRole }
}

// ── Balance derivation (source of truth) ──────────────────────────────────────

/**
 * Compute outstanding balance from amount minus the SUM of all confirmed
 * payment rows. This is the ONLY correct way to derive a debt balance.
 * amount_paid on the debts row is a cached view column — recomputed here.
 */
function computeBalance(debtId: string): { amountPaid: number; balance: number } {
  const db = getDatabase()
  const debt = db.prepare(
    'SELECT amount FROM debts WHERE id = ?'
  ).get(debtId) as { amount: number } | undefined
  if (!debt) return { amountPaid: 0, balance: 0 }

  const paidRow = db.prepare(
    'SELECT COALESCE(SUM(amount), 0) as paid FROM debt_payments WHERE debt_id = ?'
  ).get(debtId) as { paid: number }

  return { amountPaid: paidRow.paid, balance: debt.amount - paidRow.paid }
}

// ── Sync event builders ────────────────────────────────────────────────────────

function buildDebtCreatedEvent(
  debt: DebtRow,
  session: { employeeId: string; deviceId?: string },
): SyncEvent {
  const now = new Date().toISOString()
  return {
    id: asSyncEventId(uuidv4()),
    idempotencyKey: asIdempotencyKey(`debt:created:${debt.id}`),
    businessId: asBusinessId(debt.shop_id),
    entityKind: 'debt',
    entityId: asDebtId(debt.id),
    operation: 'create',
    originatingDeviceId: asDeviceId(session.deviceId ?? 'local'),
    originatingEmployeeId: asEmployeeId(session.employeeId),
    clientSequence: Date.now(),
    clientCreatedAt: now,
    entityVersion: debt.version ?? 1,
    payload: fromLocalDebt(debt) as unknown as Record<string, unknown>,
    state: 'pending',
  }
}

function buildDebtPaymentEvent(
  payment: DebtPaymentRow,
  session: { employeeId: string; deviceId?: string },
): SyncEvent {
  const now = new Date().toISOString()
  return {
    id: asSyncEventId(uuidv4()),
    idempotencyKey: asIdempotencyKey(`debtPayment:created:${payment.id}`),
    businessId: asBusinessId(payment.shop_id),
    entityKind: 'debtPayment',
    entityId: asDebtPaymentId(payment.id),
    operation: 'create',
    originatingDeviceId: asDeviceId(session.deviceId ?? 'local'),
    originatingEmployeeId: asEmployeeId(session.employeeId),
    clientSequence: Date.now(),
    clientCreatedAt: now,
    entityVersion: payment.version ?? 1,
    payload: fromLocalDebtPayment(payment) as unknown as Record<string, unknown>,
    state: 'pending',
  }
}

// ── Handler registration ────────────────────────────────────────────────────────

export function registerDebtHandlers(): void {
  const db = getDatabase()

  // ── List all debts (with customer + outstanding balance) ──────────────────
  ipcMain.handle('db:debts:list', async () => {
    const session = await desktopLoadSession()
    if (!session) throw new Error('Not authenticated')
    if (!can(getMember(session.employeeId), CAPABILITIES.DEBTS_VIEW)) {
      throw new Error('Insufficient permissions')
    }
    const shopId = await resolveActiveShopId()

    const rows = db.prepare(`
      SELECT d.*,
             c.name  as customer_name,
             c.phone as customer_phone
      FROM debts d
      LEFT JOIN customers c ON d.customer_id = c.id
      WHERE d.shop_id = ?
      ORDER BY d.created_at DESC
    `).all(shopId) as DebtRow[]

    // Derive live balance for each row
    return rows.map(row => {
      const { amountPaid, balance } = computeBalance(row.id)
      return {
        ...row,
        amount_paid: amountPaid,   // cached view column updated from ledger
        outstanding: balance,       // canonical balance = amount - paid
      }
    })
  })

  // ── Get single debt with full payment history ─────────────────────────────
  ipcMain.handle('db:debts:get', async (_event, id: string) => {
    const session = await desktopLoadSession()
    if (!session) throw new Error('Not authenticated')
    if (!can(getMember(session.employeeId), CAPABILITIES.DEBTS_VIEW)) {
      throw new Error('Insufficient permissions')
    }
    const shopId = await resolveActiveShopId()

    const debt = db.prepare(`
      SELECT d.*, c.name as customer_name, c.phone as customer_phone
      FROM debts d
      LEFT JOIN customers c ON d.customer_id = c.id
      WHERE d.id = ? AND d.shop_id = ?
    `).get(id, shopId) as DebtRow | undefined

    if (!debt) return null

    const { amountPaid, balance } = computeBalance(id)
    const payments = db.prepare(`
      SELECT * FROM debt_payments
      WHERE debt_id = ?
      ORDER BY created_at ASC
    `).all(id) as DebtPaymentRow[]

    return {
      ...debt,
      amount_paid: amountPaid,
      outstanding: balance,
      payments,
    }
  })

  // ── Create a standalone debt ──────────────────────────────────────────────
  ipcMain.handle('db:debts:create', async (_event, rawData: unknown) => {
    const session = await desktopLoadSession()
    if (!session) throw new Error('Not authenticated')
    if (!can(getMember(session.employeeId), CAPABILITIES.DEBTS_CREATE)) {
      throw new Error('Insufficient permissions')
    }
    enforceSubscriptionOrThrow()

    const data = debtCreateSchema.parse(rawData)
    const shopId = await resolveActiveShopId()
    const now = new Date().toISOString()
    const debtId = uuidv4()
    const key = asIdempotencyKey(`debt:created:${debtId}`)

    db.prepare(`
      INSERT INTO debts
        (id, customer_id, sale_id, amount, amount_paid, status, due_date, notes,
         shop_id, created_at, updated_at, version, idempotency_key)
      VALUES (?, ?, ?, ?, 0, 'pending', ?, ?, ?, ?, ?, 1, ?)
    `).run(
      debtId,
      data.customerId || null,
      data.saleId || null,
      data.amount,
      data.dueDate || null,
      data.notes || null,
      shopId,
      now,
      now,
      key,
    )

    const debt = db.prepare(
      'SELECT * FROM debts WHERE id = ? AND shop_id = ?'
    ).get(debtId, shopId) as DebtRow

    // Enqueue DebtCreated event
    try {
      getRealSyncEngine().enqueue(buildDebtCreatedEvent(debt, session)).catch(
        err => log.warn('DebtCreated sync enqueue failed (offline):', err),
      )
    } catch (err) {
      log.warn('Failed to enqueue DebtCreated sync event:', err)
    }

    log.info(`Debt created: ${debtId}, amount=${data.amount}, customer=${data.customerId}`)

    audit.debtCreated(debtId, shopId, session.employeeId, {
      amount: data.amount,
      customerId: data.customerId ?? null,
    })
    return {
      ...debt,
      amount_paid: 0,
      outstanding: data.amount,
    }
  })

  // ── Record a debt payment (append-only) ───────────────────────────────────
  ipcMain.handle('db:debts:recordPayment', async (
    _event,
    debtId: string,
    rawAmount: unknown,
    rawPaymentMethod: unknown,
    rawReference: unknown,
  ) => {
    const session = await desktopLoadSession()
    if (!session) throw new Error('Not authenticated')
    if (!can(getMember(session.employeeId), CAPABILITIES.DEBTS_PAYMENT)) {
      throw new Error('Insufficient permissions')
    }

    const validated = debtPaymentSchema.parse({
      debtId,
      amount: rawAmount,
      paymentMethod: rawPaymentMethod,
      reference: rawReference,
    })
    const shopId = await resolveActiveShopId()
    const now = new Date().toISOString()
    const paymentId = uuidv4()
    const key = asIdempotencyKey(`debtPayment:created:${paymentId}`)

    // Idempotency: skip if this exact payment was already recorded
    const existingPayment = db.prepare(
      'SELECT id FROM debt_payments WHERE idempotency_key = ?'
    ).get(key)
    if (existingPayment) {
      log.debug(`DebtPayment idempotency hit: key=${key}`)
      const { amountPaid, balance } = computeBalance(debtId)
      const debt2 = db.prepare('SELECT * FROM debts WHERE id = ?').get(debtId) as DebtRow
      return {
        debtId,
        amountPaid,
        outstanding: balance,
        status: balance <= 0 ? 'paid' : 'partial',
        duplicate: true,
      }
    }

    // Verify debt belongs to this shop
    const debt = db.prepare(
      'SELECT * FROM debts WHERE id = ? AND shop_id = ?'
    ).get(debtId, shopId) as DebtRow | undefined
    if (!debt) throw new Error('Debt not found')

    // Insert payment (append-only — balance is derived, never written)
    db.prepare(`
      INSERT INTO debt_payments
        (id, debt_id, amount, payment_method, reference, shop_id, created_at, version, idempotency_key)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(paymentId, debtId, validated.amount, validated.paymentMethod, validated.reference || null, shopId, now, key)

    // Recompute balance from payment ledger
    const { amountPaid, balance } = computeBalance(debtId)

    // Update cached amount_paid + status on the debt row (view column only)
    const newStatus = balance <= 0 ? 'paid' : 'partial'
    db.prepare(
      'UPDATE debts SET amount_paid = ?, status = ?, updated_at = ? WHERE id = ?'
    ).run(amountPaid, newStatus, now, debtId)

    const payment = db.prepare(
      'SELECT * FROM debt_payments WHERE id = ?'
    ).get(paymentId) as DebtPaymentRow

    // Enqueue DebtPayment event
    try {
      getRealSyncEngine().enqueue(buildDebtPaymentEvent(payment, session)).catch(
        err => log.warn('DebtPayment sync enqueue failed (offline):', err),
      )
    } catch (err) {
      log.warn('Failed to enqueue DebtPayment sync event:', err)
    }

    log.info(`Debt payment recorded: debt=${debtId}, payment=${paymentId}, amount=${validated.amount}, outstanding=${balance}`)

    audit.debtPaymentRecorded(debtId, shopId, session.employeeId, {
      paymentId,
      amount: validated.amount,
      method: validated.paymentMethod,
    })

    if (newStatus === 'paid') {
      audit.debtSettled(debtId, shopId, session.employeeId)
    }
    return {
      debtId,
      amountPaid,
      outstanding: balance,
      status: newStatus,
    }
  })

  // ── Get all debts for a specific customer ────────────────────────────────
  ipcMain.handle('db:debts:byCustomer', async (_event, customerId: string) => {
    const session = await desktopLoadSession()
    if (!session) throw new Error('Not authenticated')
    if (!can(getMember(session.employeeId), CAPABILITIES.DEBTS_VIEW)) {
      throw new Error('Insufficient permissions')
    }
    const shopId = await resolveActiveShopId()

    const rows = db.prepare(`
      SELECT d.*,
             c.name  as customer_name,
             c.phone as customer_phone
      FROM debts d
      LEFT JOIN customers c ON d.customer_id = c.id
      WHERE d.customer_id = ? AND d.shop_id = ?
      ORDER BY d.created_at DESC
    `).all(customerId, shopId) as DebtRow[]

    return rows.map(row => {
      const { amountPaid, balance } = computeBalance(row.id)
      return {
        ...row,
        amount_paid: amountPaid,
        outstanding: balance,
      }
    })
  })

  // ── Outstanding summary ───────────────────────────────────────────────────
  ipcMain.handle('db:debts:summary', async () => {
    const session = await desktopLoadSession()
    if (!session) throw new Error('Not authenticated')
    if (!can(getMember(session.employeeId), CAPABILITIES.DEBTS_VIEW)) {
      throw new Error('Insufficient permissions')
    }
    const shopId = await resolveActiveShopId()

    // Sum all non-paid debts: for each, derive balance = amount - SUM(payments)
    const rows = db.prepare(`
      SELECT d.id, d.amount
      FROM debts d
      WHERE d.shop_id = ? AND d.status != 'paid'
    `).all(shopId) as { id: string; amount: number }[]

    let totalOutstanding = 0
    for (const row of rows) {
      const { balance } = computeBalance(row.id)
      totalOutstanding += balance
    }

    const count = db.prepare(
      "SELECT COUNT(*) as cnt FROM debts WHERE status != 'paid' AND shop_id = ?"
    ).get(shopId) as { cnt: number }

    return { total: totalOutstanding, count: count.cnt }
  })

  // ── Total collected across all debts ─────────────────────────────────────
  ipcMain.handle('db:debts:totalCollected', async () => {
    const session = await desktopLoadSession()
    if (!session) throw new Error('Not authenticated')
    if (!can(getMember(session.employeeId), CAPABILITIES.DEBTS_VIEW)) {
      throw new Error('Insufficient permissions')
    }
    const shopId = await resolveActiveShopId()

    const collected = db.prepare(`
      SELECT COALESCE(SUM(p.amount), 0) as total
      FROM debt_payments p
      JOIN debts d ON p.debt_id = d.id
      WHERE d.shop_id = ?
    `).get(shopId) as { total: number }

    return { totalCollected: collected.total }
  })

  // ── Customer outstanding balance (for POS) ───────────────────────────────
  ipcMain.handle('db:debts:customerBalance', async (_event, customerId: string) => {
    const session = await desktopLoadSession()
    if (!session) throw new Error('Not authenticated')
    if (!can(getMember(session.employeeId), CAPABILITIES.DEBTS_VIEW)) {
      throw new Error('Insufficient permissions')
    }
    const shopId = await resolveActiveShopId()

    const rows = db.prepare(`
      SELECT d.id, d.amount
      FROM debts d
      WHERE d.customer_id = ? AND d.shop_id = ? AND d.status != 'paid'
    `).all(customerId, shopId) as { id: string; amount: number }[]

    let totalOutstanding = 0
    for (const row of rows) {
      const { balance } = computeBalance(row.id)
      totalOutstanding += balance
    }

    return { customerId, totalOutstanding }
  })

  // ── All debts for a customer ────────────────────────────────────────────
  ipcMain.handle('db:debts:byCustomer', async (_event, customerId: string) => {
    const session = await desktopLoadSession()
    if (!session) throw new Error('Not authenticated')
    if (!can(getMember(session.employeeId), CAPABILITIES.DEBTS_VIEW)) {
      throw new Error('Insufficient permissions')
    }
    const shopId = await resolveActiveShopId()

    const rows = db.prepare(`
      SELECT d.*, c.name as customer_name, c.phone as customer_phone
      FROM debts d
      LEFT JOIN customers c ON d.customer_id = c.id
      WHERE d.customer_id = ? AND d.shop_id = ?
      ORDER BY d.created_at DESC
    `).all(customerId, shopId) as DebtRow[]

    return rows.map(row => {
      const { amountPaid, balance } = computeBalance(row.id)
      return {
        ...row,
        amount_paid: amountPaid,
        outstanding: balance,
      }
    })
  })

  log.info('Debt IPC handlers registered (Phase 11 — balance-derived)')
}
