import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'
import { debtCreateSchema, debtPaymentSchema } from './validation'
import { z } from 'zod'

interface DebtRow {
  id: string
  customer_id: string | null
  sale_id: string | null
  amount: number
  amount_paid: number
  status: string
  due_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

interface SummaryRow {
  val: number
}

export function registerDebtHandlers(): void {
  ipcMain.handle('db:debts:list', () => {
    const db = getDatabase()
    return db.prepare(`
      SELECT d.*, c.name as customer_name, c.phone as customer_phone
      FROM debts d
      LEFT JOIN customers c ON d.customer_id = c.id
      ORDER BY d.created_at DESC
    `).all()
  })

  ipcMain.handle('db:debts:get', (_event, id: string) => {
    const db = getDatabase()
    const debt = db.prepare(`
      SELECT d.*, c.name as customer_name, c.phone as customer_phone
      FROM debts d LEFT JOIN customers c ON d.customer_id = c.id
      WHERE d.id = ?
    `).get(id)
    if (debt) {
      const payments = db.prepare('SELECT * FROM debt_payments WHERE debt_id = ? ORDER BY created_at DESC').all(id)
      return { ...debt, payments }
    }
    return null
  })

  ipcMain.handle('db:debts:create', (_event, rawData: unknown) => {
    const data = debtCreateSchema.parse(rawData)
    const db = getDatabase()
    const id = uuidv4()
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO debts (id, customer_id, sale_id, amount, amount_paid, status, due_date, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, 0, 'pending', ?, ?, ?, ?)
    `).run(id, data.customerId || null, data.saleId || null, data.amount, data.dueDate || null, data.notes || null, now, now)
    return db.prepare('SELECT * FROM debts WHERE id = ?').get(id)
  })

  ipcMain.handle('db:debts:recordPayment', (_event, debtId: string, rawAmount: unknown, rawPaymentMethod: unknown, rawReference: unknown) => {
    const validated = debtPaymentSchema.parse({ debtId, amount: rawAmount, paymentMethod: rawPaymentMethod, reference: rawReference })
    const db = getDatabase()
    const now = new Date().toISOString()

    const debt = db.prepare('SELECT * FROM debts WHERE id = ?').get(debtId) as DebtRow | undefined
    if (!debt) throw new Error('Debt not found')

    const newPaid = (debt.amount_paid || 0) + validated.amount
    const newStatus = newPaid >= debt.amount ? 'paid' : 'partial'

    db.prepare('UPDATE debts SET amount_paid = ?, status = ?, updated_at = ? WHERE id = ?')
      .run(newPaid, newStatus, now, debtId)

    const paymentId = uuidv4()
    db.prepare(`
      INSERT INTO debt_payments (id, debt_id, amount, payment_method, reference, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(paymentId, debtId, validated.amount, validated.paymentMethod, validated.reference || null, now)

    return { debtId, amountPaid: newPaid, status: newStatus }
  })

  ipcMain.handle('db:debts:summary', () => {
    const db = getDatabase()
    const total = db.prepare("SELECT COALESCE(SUM(amount - amount_paid), 0) as val FROM debts WHERE status != 'paid'").get() as SummaryRow | undefined
    const count = db.prepare("SELECT COUNT(*) as val FROM debts WHERE status != 'paid'").get() as SummaryRow | undefined
    return { total: total?.val || 0, count: count?.val || 0 }
  })

  ipcMain.handle('db:debts:totalCollected', () => {
    const db = getDatabase()
    const collected = db.prepare("SELECT COALESCE(SUM(amount_paid), 0) as val FROM debts WHERE status IN ('paid', 'partial')").get() as SummaryRow | undefined
    return { totalCollected: collected?.val || 0 }
  })

  log.info('Debt IPC handlers registered')
}
