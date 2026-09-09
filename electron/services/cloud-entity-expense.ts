/**
 * cloud-entity-expense.ts — Expense push to cloud InstantDB.
 * Part of cloud-entity-sync split per ANPAS (≤150 lines per file).
 */

import { getDatabase } from '../database'
import * as instant from './instant-api'
import log from 'electron-log'

const APP_ID = process.env.INSTANT_APP_ID || ''

export async function pushExpense(expenseId: string): Promise<void> {
  if (!APP_ID) return
  const db = getDatabase()
  const exp = db.prepare('SELECT * FROM expenses WHERE id = ?').get(expenseId) as Record<string, unknown> | undefined
  if (!exp) return

  try {
    await instant.instamlTx(APP_ID, [[
      'update', 'expenses', expenseId, {
        id: expenseId,
        shopId: (exp.shop_id as string) ?? '',
        categoryId: exp.category_id as string | null,
        categoryName: exp.category_name as string | null,
        amount: Number(exp.amount) || 0,
        description: exp.description as string | null,
        reference: exp.reference as string | null,
        date: exp.date as string,
        createdAt: exp.created_at as string,
        updatedAt: new Date().toISOString(),
      }
    ]])
  } catch (err) {
    log.warn('pushExpense failed:', err)
  }
}
