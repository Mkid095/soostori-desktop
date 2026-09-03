import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'
import { z } from 'zod'
import { pushExpense } from '../services/cloud-entity-sync'

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
  ipcMain.handle('db:expenses:list', () => {
    const db = getDatabase()
    return db.prepare('SELECT * FROM expenses ORDER BY date DESC, created_at DESC').all()
  })

  ipcMain.handle('db:expenses:create', (_event, rawData: unknown) => {
    const data = expenseInputSchema.parse(rawData)
    const db = getDatabase()
    const id = uuidv4()
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO expenses (id, amount, category, note, date, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, data.amount, data.category, data.note || '', data.date, now)
    pushExpense(id).catch(() => {})
    return db.prepare('SELECT * FROM expenses WHERE id = ?').get(id) as ExpenseRow
  })

  ipcMain.handle('db:expenses:delete', (_event, id: string) => {
    getDatabase().prepare('DELETE FROM expenses WHERE id = ?').run(id)
  })

  log.info('Expense IPC handlers registered')
}
