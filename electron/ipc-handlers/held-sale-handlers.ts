/**
 * held-sale-handlers.ts — Held sale (cart save/restore) IPC handlers.
 * Part of sale-handlers-mutation split per ANPAS.
 */

import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import { heldSaleCreateSchema } from './validation'

interface HeldSaleRow {
  id: string; name: string | null; cart_items: string
  payment_method: string | null; created_at: string
}

export function registerHeldSaleHandlers(): void {
  ipcMain.handle('db:held-sales:list',
    () => getDatabase().prepare('SELECT * FROM held_sales ORDER BY created_at DESC').all())

  ipcMain.handle('db:held-sales:create', (_event, rawSaleData: unknown) => {
    const saleData = heldSaleCreateSchema.parse(rawSaleData)
    const db = getDatabase()
    const id = uuidv4()
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO held_sales (id, name, cart_items, payment_method, created_at) VALUES (?, ?, ?, ?, ?)`,
    ).run(id, saleData.name || `Sale ${new Date().toLocaleTimeString()}`,
      JSON.stringify(saleData.cartItems), saleData.paymentMethod || 'cash', now)
    return db.prepare('SELECT * FROM held_sales WHERE id = ?').get(id)
  })

  ipcMain.handle('db:held-sales:delete', (_event, id: string) => {
    getDatabase().prepare('DELETE FROM held_sales WHERE id = ?').run(id)
  })

  ipcMain.handle('db:held-sales:restore', (_event, id: string) => {
    const heldSale = getDatabase().prepare('SELECT * FROM held_sales WHERE id = ?').get(id) as HeldSaleRow | undefined
    return heldSale ? { ...heldSale, cartItems: JSON.parse(heldSale.cart_items) } : null
  })
}
