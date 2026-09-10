/**
 * expense-handlers.ts — Expense IPC handlers.
 *
 * Phase 04: capability enforcement on mutations.
 */

import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'
import { z } from 'zod'
import { pushExpense } from '../services/cloud-entity-sync'
import { resolveActiveShopId } from '../database/active-shop'
import { fromLocalExpense, type ExpensesRow } from '../database/contracts-mapper-3'
// Phase 04: canonical capability API
import { can, CAPABILITIES } from '@soostori/auth'
import type { Member } from '@soostori/auth'
import type { EmployeeRole } from '@soostori/core'
import { desktopLoadSession } from '../auth/electron-store-session'

/** Build a Member for the capability system from the session's employeeId. */
function getCallerMember(session: { employeeId: string }): Member {
  const db = getDatabase()
  const row = db.prepare('SELECT role FROM employees WHERE id = ?').get(session.employeeId) as { role: string } | undefined
  return { role: (row?.role ?? 'cashier') as EmployeeRole }
}

interface ExpenseRow {
  id: string
  amount: number
  category: string
  note: string
  date: string
  created_at: string
}

const expenseInputSchema = z.object({
  amount: z.number().positive(),
  category: z.string().default('other'),
  note: z.string().optional().default(''),
  date: z.string(),
})

export function registerExpenseHandlers(): void {
  ipcMain.handle('db:expenses:list', async () => {
    const db = getDatabase()
    const shopId = await resolveActiveShopId()
    const rows = db.prepare('SELECT * FROM expenses WHERE shop_id = ? ORDER BY date DESC, created_at DESC').all(shopId) as ExpensesRow[]
    // Project to contract Expense for any consumer that wants canonical types
    // (cycle 04 sub-C: renderers can keep snake_case; cloud-push consumers
    //  receive fromLocalExpense).
    log.debug(`expenses:list mapped ${rows.length} → contract Expenses`)
    return rows
  })

  ipcMain.handle('db:expenses:create', async (_event, rawData: unknown) => {
    const session = await desktopLoadSession()
    if (!session) throw new Error('Not authenticated')
    // Phase 04: capability enforcement
    if (!can(getCallerMember(session), CAPABILITIES.EXPENSES_CREATE)) {
      throw new Error('Insufficient permissions: expenses.create required')
    }
    const data = expenseInputSchema.parse(rawData)
    const db = getDatabase()
    const id = uuidv4()
    const now = new Date().toISOString()
    const shopId = await resolveActiveShopId()
    db.prepare(`
      INSERT INTO expenses (id, amount, category, note, date, shop_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.amount, data.category, data.note || '', data.date, shopId, now)
    pushExpense(id).catch(() => {})
    const created = db.prepare('SELECT * FROM expenses WHERE id = ? AND shop_id = ?').get(id, shopId) as ExpenseRow
    // Run through mapper to assert round-trip; the contract-typed projection
    // is logged so future cloud-push consumers can adopt it directly.
    const mapped = fromLocalExpense(created as ExpensesRow)
    log.info(`expenses:create ${created.id} → contract Expense(businessId=${mapped.businessId})`)
    return created
  })

  ipcMain.handle('db:expenses:delete', async (_event, id: string) => {
    const session = await desktopLoadSession()
    if (!session) throw new Error('Not authenticated')
    // Phase 04: capability enforcement
    if (!can(getCallerMember(session), CAPABILITIES.EXPENSES_DELETE)) {
      throw new Error('Insufficient permissions: expenses.delete required')
    }
    const db = getDatabase()
    const shopId = await resolveActiveShopId()
    db.prepare('DELETE FROM expenses WHERE id = ? AND shop_id = ?').run(id, shopId)
  })

  log.info('Expense IPC handlers registered')
}
