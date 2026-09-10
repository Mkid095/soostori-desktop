/**
 * sale-create-handlers.ts — Sale creation IPC handlers (host path).
 * Part of sale-handlers-mutation split per ANPAS.
 */

import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'
import { saleCreateSchema } from './validation'
import { commitSale } from '../sdk/sale-orchestrator'
import { pushSale } from '../services/cloud-entity-sync'
import { syncService } from '../sync/sync-service'
import { notify } from '../services/notification-service'
import { resolveActiveShopId } from '../database/active-shop'

const db = getDatabase()

export function registerSaleCreateHandlers(): void {
  ipcMain.handle('db:sales:create', async (_event, rawSaleData: unknown) => {
    const saleData = saleCreateSchema.parse(rawSaleData)
    const shopId = (saleData as { shopId?: string }).shopId || await resolveActiveShopId()
    const userId = (saleData as { userId?: string }).userId || 'system'
    const deviceId = (saleData as { deviceId?: string }).deviceId || null
    const saleId = uuidv4()

    // Client mode: send to host via LAN for authorization
    if (syncService.getMode() === 'client') {
      syncService.sendSalePending({
        saleId, total: saleData.totalAmount || 0,
        paymentMethod: saleData.paymentMethod || 'cash',
        items: (saleData.items || []).map(i => ({ productId: i.productId || '', quantity: i.quantity })),
      })
      return { id: saleId, status: 'pending', total_amount: saleData.totalAmount, payment_method: 'pending' }
    }

    // Host/Offline path
    try {
      await commitSale({
        saleId, userId, deviceId: deviceId || '',
        items: (saleData.items || []).map(i => ({
          productId: i.productId || '', productName: i.productName, quantity: i.quantity,
          unitPrice: i.unitPrice || 0, discount: i.discount,
          totalPrice: i.totalPrice || (i.quantity * (i.unitPrice || 0)), variationName: i.variationName,
        })),
        paymentMethod: (saleData.paymentMethod || 'cash') as 'cash' | 'mobile_money' | 'card' | 'transfer' | 'debt',
        paidAmount: saleData.paidAmount || saleData.totalAmount || 0,
        discountAmount: saleData.discountAmount, taxAmount: saleData.taxAmount,
        note: saleData.note, customerId: saleData.customerId, customerName: saleData.customerName,
        customerIdNumber: saleData.customerIdNumber,
      })

      // Low-stock notifications via SDK engine (scoped to current shop)
      for (const item of saleData.items || []) {
        if (!item.productId) continue
        const product = db.prepare(
          'SELECT name, current_stock, track_inventory, low_stock_threshold FROM products WHERE id = ? AND shop_id = ?',
        ).get(item.productId, shopId) as { name: string; current_stock: number; track_inventory: number | null; low_stock_threshold: number | null } | undefined
        if (product?.track_inventory && product?.low_stock_threshold != null &&
            product.current_stock <= product.low_stock_threshold && product.current_stock >= 0) {
          notify('stock.low', {
            productName: product.name,
            currentStock: product.current_stock,
            threshold: product.low_stock_threshold,
            productId: item.productId,
          }, shopId).catch(() => {})
        }
      }

      // Debt record — stamp shop_id from active session
      if (saleData.paymentMethod === 'debt') {
        let customerId = saleData.customerId || null
        if (!customerId && (saleData.customerName || saleData.customerPhone)) {
          const custId = uuidv4()
          getDatabase().prepare(
            `INSERT INTO customers (id, name, phone, shop_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
          ).run(custId, saleData.customerName || 'Unknown', saleData.customerPhone || null, shopId,
            new Date().toISOString(), new Date().toISOString())
          customerId = custId
        }
        if (customerId) {
          getDatabase().prepare(
            `INSERT INTO debts (id, customer_id, sale_id, amount, amount_paid, status, notes, shop_id, created_at, updated_at) VALUES (?, ?, ?, ?, 0, 'pending', ?, ?, ?, ?)`,
          ).run(uuidv4(), customerId, saleId, saleData.totalAmount, saleData.note || null, shopId,
            new Date().toISOString(), new Date().toISOString())
        }
      }

      log.info(`Sale committed via SDK: ${saleId}, total: ${saleData.totalAmount}`)
      pushSale(saleId).catch(() => {})
      db.prepare(`INSERT INTO audit_logs (id, shop_id, user_id, device_id, action, entity_type, entity_id, payload, created_at) VALUES (?, ?, ?, ?, 'sale_completed', 'sale', ?, ?, datetime('now'))`)
        .run(uuidv4(), shopId, userId, deviceId || null, saleId, JSON.stringify({ total: saleData.totalAmount }))

      // Notify via @soostori/notifications engine — flows to in-app channel and beyond
      notify('sale.confirmed', {
        saleId,
        total: saleData.totalAmount,
      }, shopId).catch(() => {})

      return { id: saleId, status: 'completed', total_amount: saleData.totalAmount, payment_method: saleData.paymentMethod }
    } catch (err: unknown) {
      const error = err as { code?: string; message: string }
      if (error.code === 'STOCK_AUTHORIZATION_ERROR') {
        throw Object.assign(new Error(`Sale denied: ${error.message}`), { code: 'SALE_REJECTED' })
      }
      throw err
    }
  })

  log.info('Sale create IPC handlers registered')
}

import { desktopLoadSession } from '../auth/electron-store-session'
import { adjustStock } from '../sdk/inventory-orchestrator'

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
