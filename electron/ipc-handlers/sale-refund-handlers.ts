/**
 * sale-refund-handlers.ts — Sale refund IPC handler (host path).
 *
 * Extracted from `sale-create-handlers.ts` per ANPAS ≤150-line cap so the
 * create handler can wire `defaultSyncEngine.enqueue()` (Cycle 04 Sub-F)
 * without blowing the cap. Zero behavior change vs. the previous home.
 */

import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import log from 'electron-log'
import { desktopLoadSession } from '../auth/electron-store-session'
import { adjustStock } from '../sdk/inventory-orchestrator'
import { syncService } from '../sync/sync-service'
import { resolveActiveShopId } from '../database/active-shop'

export function registerSaleRefundHandlers(): void {
  ipcMain.handle('db:sales:refund', async (_event, saleId: string) => {
    const session = await desktopLoadSession()
    const userId = session?.userId ?? 'system'
    const db = getDatabase()
    const shopId = await resolveActiveShopId()
    const sale = db.prepare('SELECT * FROM sales WHERE id = ? AND shop_id = ?').get(saleId, shopId) as {
      id: string; status: string; items_summary: string | null
    } | undefined
    if (!sale) throw new Error('Sale not found')
    if (sale.status === 'refunded') throw new Error('Sale already refunded')

    const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ? AND shop_id = ?').all(saleId, shopId) as Array<{
      product_id: string | null; quantity: number; product_name: string
    }>

    for (const item of items) {
      if (!item.product_id) continue
      try {
        await adjustStock({ productId: item.product_id, quantity: item.quantity, reason: `refund:${saleId}`, userId })
      } catch (err) {
        throw Object.assign(new Error(`Refund blocked: Primary Device must be ONLINE. Restore stock manually if needed.`), { code: 'STOCK_AUTHORIZATION_ERROR' })
      }
    }

    db.prepare("UPDATE sales SET status = 'refunded', updated_at = ? WHERE id = ? AND shop_id = ?")
      .run(new Date().toISOString(), saleId, shopId)
    // Broadcast SALE_REFUNDED so all LAN devices mark the sale refunded
    syncService.sendLocalMutation('SALE_REFUNDED', { saleId })
    log.info(`Sale ${saleId} refunded by ${userId}`)
    return { id: saleId, status: 'refunded' }
  })
}