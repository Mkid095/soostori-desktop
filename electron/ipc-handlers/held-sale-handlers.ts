/**
 * held-sale-handlers.ts — Held sale (cart save/restore) IPC handlers.
 * Part of sale-handlers-mutation split per ANPAS.
 */

import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import { heldSaleCreateSchema } from './validation'
import { resolveActiveShopId, resolveShopIdSync } from '../database/active-shop'

interface HeldSaleRow {
  id: string; name: string | null; cart_items: string
  payment_method: string | null; created_at: string
}

export function registerHeldSaleHandlers(): void {
  ipcMain.handle('db:held-sales:list', async () => {
    const shopId = await resolveActiveShopId()
    return getDatabase().prepare('SELECT * FROM held_sales WHERE shop_id = ? ORDER BY created_at DESC').all(shopId)
  })

  ipcMain.handle('db:held-sales:create', (_event, rawSaleData: unknown) => {
    const saleData = heldSaleCreateSchema.parse(rawSaleData)
    const db = getDatabase()
    const id = uuidv4()
    const now = new Date().toISOString()
    const shopId = resolveShopIdSync()
    db.prepare(
      `INSERT INTO held_sales (id, name, cart_items, payment_method, shop_id, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(id, saleData.name || `Sale ${new Date().toLocaleTimeString()}`,
      JSON.stringify(saleData.cartItems), saleData.paymentMethod || 'cash', shopId, now)
    return db.prepare('SELECT * FROM held_sales WHERE id = ? AND shop_id = ?').get(id, shopId)
  })

  ipcMain.handle('db:held-sales:delete', async (_event, id: string) => {
    const shopId = await resolveActiveShopId()
    getDatabase().prepare('DELETE FROM held_sales WHERE id = ? AND shop_id = ?').run(id, shopId)
  })

  ipcMain.handle('db:held-sales:restore', async (_event, id: string) => {
    const shopId = await resolveActiveShopId()
    const heldSale = getDatabase().prepare('SELECT * FROM held_sales WHERE id = ? AND shop_id = ?').get(id, shopId) as HeldSaleRow | undefined
    return heldSale ? { ...heldSale, cartItems: JSON.parse(heldSale.cart_items) } : null
  })
}
