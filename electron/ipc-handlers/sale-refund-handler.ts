import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'
import { saleRefundSchema } from './validation'
import { applyRefundStockReturn } from './sale-stock-helpers'

export function registerSaleRefundHandler(): void {
  ipcMain.handle('db:sales:refund', (_event, rawRefundData: unknown) => {
    const refundData = saleRefundSchema.parse(rawRefundData)
    const db = getDatabase()
    const now = new Date().toISOString()

    // Load existing sale
    const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(refundData.saleId) as {
      id: string; status: string; total_amount: number; payment_method: string;
    } | undefined
    if (!sale) throw new Error(`Sale not found: ${refundData.saleId}`)
    if (sale.status === 'refunded') throw new Error('Sale already refunded')

    // Determine which items to refund and their quantities
    const existingItems = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(refundData.saleId) as Array<{
      id: string; product_id: string | null; product_name: string; quantity: number; unit_price: number;
    }>
    const itemsToRefund = refundData.items
      ? refundData.items.map(ri => {
          const ex = existingItems.find(i => i.product_id === ri.productId)
          return { productId: ri.productId, quantity: ri.quantity, actualQty: Math.min(ri.quantity, ex?.quantity ?? 0), productName: ex?.product_name ?? '' }
        })
      : existingItems.map(i => ({ productId: i.product_id, quantity: i.quantity, actualQty: i.quantity, productName: i.product_name }))

    const shopId = 'default'
    const userId = 'system'
    const deviceId: string | null = null

    // Return stock for each item
    for (const item of itemsToRefund) {
      if (!item.productId) continue
      applyRefundStockReturn(db, { productId: item.productId, quantity: item.actualQty, productName: item.productName },
        refundData.saleId, shopId, deviceId, userId, now)
    }

    // Mark sale as refunded
    db.prepare('UPDATE sales SET status = ?, updated_at = ? WHERE id = ?').run('refunded', now, refundData.saleId)

    // Reverse debt record if sale was debt
    if (sale.payment_method === 'debt') {
      db.prepare(`UPDATE debts SET status = 'cancelled', notes = ?, updated_at = ? WHERE sale_id = ?`)
        .run(`Refunded: ${refundData.reason || 'No reason'}`, now, refundData.saleId)
    }

    // Audit log
    const auditPayload = JSON.stringify({ saleId: refundData.saleId, reason: refundData.reason })
    try {
      db.prepare(`INSERT INTO audit_logs (id, shop_id, user_id, device_id, action, entity_type, entity_id, payload, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(uuidv4(), shopId, userId, deviceId, 'sale_refunded', 'sale', refundData.saleId, auditPayload, now)
    } catch { log.warn('Failed to write refund audit log') }

    log.info(`Sale refunded: ${refundData.saleId}, reason: ${refundData.reason || 'unspecified'}`)
    return db.prepare('SELECT * FROM sales WHERE id = ?').get(refundData.saleId)
  })
}
