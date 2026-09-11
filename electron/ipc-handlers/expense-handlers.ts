/**
 * expense-handlers.ts — Expense IPC handlers.
 *
 * Phase 12: approveExpense, markExpensePaid, getExpenseSummary,
 *           sync events wired via RealSyncEngine.
 * Recurring handlers: recurring-expense-handlers.ts
 */

import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'
import { z } from 'zod'
import { pushExpense } from '../services/cloud-entity-sync'
import { resolveActiveShopId } from '../database/active-shop'
import { fromLocalExpense, type ExpensesRow } from '../database/contracts-mapper-3'
import { getRealSyncEngine } from '../sync/sync-engine'
import { buildExpenseSyncEvent } from '../database/sync-event-builder'
import { can, CAPABILITIES } from '@soostori/auth'
import type { Member } from '@soostori/auth'
import type { DeviceId, EmployeeRole } from '@soostori/core'
import { desktopLoadSession } from '../auth/electron-store-session'
import { audit } from '../services/audit-logger'
import { enforceSubscriptionOrThrow } from '../services/subscription-enforcer'
import type { Expense } from '@soostori/contracts'

function getCallerMember(session: { employeeId: string }): Member {
  const db = getDatabase()
  const row = db.prepare('SELECT role FROM employees WHERE id = ?').get(session.employeeId) as { role: string } | undefined
  return { role: (row?.role ?? 'cashier') as EmployeeRole }
}

interface ExpenseRow {
  id: string; amount: number; category: string; note: string; date: string
  status: string; paid_at: string | null; created_at: string
}

const expenseInputSchema = z.object({
  amount: z.number().positive(),
  category: z.string().default('other'),
  note: z.string().optional().default(''),
  date: z.string(),
  vendor: z.string().optional(),
})

async function enqueueExpenseEvent(operation: 'create' | 'update', expenseId: string): Promise<void> {
  const session = await desktopLoadSession()
  if (!session) return
  const db = getDatabase()
  const shopId = await resolveActiveShopId()
  const row = db.prepare('SELECT * FROM expenses WHERE id = ? AND shop_id = ?').get(expenseId, shopId) as ExpensesRow | undefined
  if (!row) return
  const expense = fromLocalExpense(row as ExpensesRow)
  try {
    const engine = getRealSyncEngine()
    const event = buildExpenseSyncEvent(operation, expense, {
      businessId: shopId as Expense['businessId'],
      originatingDeviceId: (session.deviceId ?? 'unknown') as DeviceId,
      originatingEmployeeId: session.employeeId as Expense['employeeId'],
      clientSequence: Date.now(),
    })
    await engine.enqueue(event)
  } catch (err) {
    log.warn('enqueueExpenseEvent failed:', err)
  }
}

export function registerExpenseHandlers(): void {
  ipcMain.handle('db:expenses:list', async () => {
    const db = getDatabase()
    const shopId = await resolveActiveShopId()
    return db.prepare('SELECT * FROM expenses WHERE shop_id = ? ORDER BY date DESC, created_at DESC').all(shopId) as ExpenseRow[]
  })

  ipcMain.handle('db:expenses:create', async (_event, rawData: unknown) => {
    const session = await desktopLoadSession()
    if (!session) throw new Error('Not authenticated')
    if (!can(getCallerMember(session), CAPABILITIES.EXPENSES_CREATE)) {
      throw new Error('Insufficient permissions: expenses.create required')
    }
    enforceSubscriptionOrThrow()
    const data = expenseInputSchema.parse(rawData)
    const db = getDatabase()
    const id = uuidv4()
    const now = new Date().toISOString()
    const shopId = await resolveActiveShopId()
    db.prepare(`
      INSERT INTO expenses (id, amount, category, note, date, shop_id, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(id, data.amount, data.category, data.note || '', data.date, shopId, now)
    pushExpense(id).catch(() => {})
    const created = db.prepare('SELECT * FROM expenses WHERE id = ? AND shop_id = ?').get(id, shopId) as ExpenseRow
    enqueueExpenseEvent('create', id).catch(() => {})
    audit.expenseCreated(id, shopId, session.employeeId, {
      amount: data.amount,
      category: data.category,
    })
    log.info(`expenses:create ${created.id}`)
    return created
  })

  ipcMain.handle('db:expenses:delete', async (_event, id: string) => {
    const session = await desktopLoadSession()
    if (!session) throw new Error('Not authenticated')
    if (!can(getCallerMember(session), CAPABILITIES.EXPENSES_DELETE)) {
      throw new Error('Insufficient permissions: expenses.delete required')
    }
    const db = getDatabase()
    const shopId = await resolveActiveShopId()
    db.prepare('DELETE FROM expenses WHERE id = ? AND shop_id = ?').run(id, shopId)
  })

  ipcMain.handle('db:expenses:approve', async (_event, id: string) => {
    const session = await desktopLoadSession()
    if (!session) throw new Error('Not authenticated')
    if (!can(getCallerMember(session), CAPABILITIES.EXPENSES_APPROVE)) {
      throw new Error('Insufficient permissions: expenses.approve required')
    }
    const db = getDatabase()
    const shopId = await resolveActiveShopId()
    const existing = db.prepare('SELECT * FROM expenses WHERE id = ? AND shop_id = ?').get(id, shopId) as ExpenseRow | undefined
    if (!existing) throw new Error('Expense not found')
    db.prepare("UPDATE expenses SET status = 'approved' WHERE id = ? AND shop_id = ?").run(id, shopId)
    const updated = db.prepare('SELECT * FROM expenses WHERE id = ? AND shop_id = ?').get(id, shopId) as ExpenseRow
    enqueueExpenseEvent('update', id).catch(() => {})
    audit.expenseCreated(id, shopId, session.employeeId, { ...existing, _action: 'approved' })
    log.info(`expenses:approve ${id}`)
    return updated
  })

  ipcMain.handle('db:expenses:markPaid', async (_event, id: string) => {
    const session = await desktopLoadSession()
    if (!session) throw new Error('Not authenticated')
    if (!can(getCallerMember(session), CAPABILITIES.EXPENSES_APPROVE)) {
      throw new Error('Insufficient permissions: expenses.approve required')
    }
    const db = getDatabase()
    const shopId = await resolveActiveShopId()
    const existing = db.prepare('SELECT * FROM expenses WHERE id = ? AND shop_id = ?').get(id, shopId) as ExpenseRow | undefined
    if (!existing) throw new Error('Expense not found')
    const now = new Date().toISOString()
    db.prepare("UPDATE expenses SET status = 'paid', paid_at = ? WHERE id = ? AND shop_id = ?").run(now, id, shopId)
    const updated = db.prepare('SELECT * FROM expenses WHERE id = ? AND shop_id = ?').get(id, shopId) as ExpenseRow
    enqueueExpenseEvent('update', id).catch(() => {})
    log.info(`expenses:markPaid ${id}`)
    return updated
  })

  ipcMain.handle('db:expenses:summary', async (_event, month: string) => {
    const db = getDatabase()
    const shopId = await resolveActiveShopId()
    const startDate = `${month}-01`
    const endDate = `${month}-31`
    const rows = db.prepare(
      "SELECT category, amount FROM expenses WHERE shop_id = ? AND date >= ? AND date <= ?"
    ).all(shopId, startDate, endDate) as { category: string; amount: number }[]
    const byCategory: Record<string, number> = {}
    let total = 0
    for (const r of rows) {
      total += r.amount
      byCategory[r.category] = (byCategory[r.category] ?? 0) + r.amount
    }
    const pending = db.prepare(
      "SELECT COUNT(*) as cnt FROM expenses WHERE shop_id = ? AND date >= ? AND date <= ? AND status = 'pending'"
    ).get(shopId, startDate, endDate) as { cnt: number }
    return { total, byCategory, pendingCount: pending?.cnt ?? 0 }
  })

  log.info('Expense IPC handlers registered (Phase 12: approve/markPaid/summary + sync)')
}
