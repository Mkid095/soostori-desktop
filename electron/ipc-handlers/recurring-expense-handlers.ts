/**
 * recurring-expense-handlers.ts — Recurring expense IPC handlers.
 * Extracted from expense-handlers.ts to comply with 150-line ANPAS cap.
 */

import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'
import { z } from 'zod'
import { resolveActiveShopId } from '../database/active-shop'
import { can, CAPABILITIES } from '@soostori/auth'
import type { Member } from '@soostori/auth'
import type { EmployeeRole } from '@soostori/core'
import { desktopLoadSession } from '../auth/electron-store-session'

function getCallerMember(session: { employeeId: string }): Member {
  const db = getDatabase()
  const row = db.prepare('SELECT role FROM employees WHERE id = ?').get(session.employeeId) as { role: string } | undefined
  return { role: (row?.role ?? 'cashier') as EmployeeRole }
}

export function registerRecurringExpenseHandlers(): void {
  ipcMain.handle('db:expenses:recurring:list', async () => {
    const db = getDatabase()
    const shopId = await resolveActiveShopId()
    return db.prepare('SELECT * FROM recurring_expenses WHERE shop_id = ? ORDER BY next_due_date ASC').all(shopId)
  })

  ipcMain.handle('db:expenses:recurring:create', async (_event, rawData: unknown) => {
    const session = await desktopLoadSession()
    if (!session) throw new Error('Not authenticated')
    if (!can(getCallerMember(session), CAPABILITIES.EXPENSES_CREATE)) {
      throw new Error('Insufficient permissions: expenses.create required')
    }
    const schema = z.object({
      amount: z.number().positive(),
      category: z.string().default('other'),
      frequency: z.enum(['daily', 'weekly', 'monthly']),
      nextDueDate: z.string(),
    })
    const data = schema.parse(rawData)
    const db = getDatabase()
    const id = uuidv4()
    const now = new Date().toISOString()
    const shopId = await resolveActiveShopId()
    db.prepare(`
      INSERT INTO recurring_expenses (id, shop_id, category, amount, frequency, next_due_date, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    `).run(id, shopId, data.category, data.amount, data.frequency, data.nextDueDate, now)
    log.info(`recurring_expense:create ${id}`)
    return db.prepare('SELECT * FROM recurring_expenses WHERE id = ? AND shop_id = ?').get(id, shopId)
  })

  ipcMain.handle('db:expenses:recurring:delete', async (_event, id: string) => {
    const session = await desktopLoadSession()
    if (!session) throw new Error('Not authenticated')
    if (!can(getCallerMember(session), CAPABILITIES.EXPENSES_DELETE)) {
      throw new Error('Insufficient permissions: expenses.delete required')
    }
    const db = getDatabase()
    const shopId = await resolveActiveShopId()
    db.prepare('DELETE FROM recurring_expenses WHERE id = ? AND shop_id = ?').run(id, shopId)
  })

  log.info('Recurring expense IPC handlers registered')
}
