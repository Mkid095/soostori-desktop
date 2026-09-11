import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'
import { saleCreateSchema } from './validation'
import { syncService } from '../sync/sync-service'
import { pushSale } from '../services/cloud-entity-sync'
import { applySaleStockDeduction, type SaleStockDelta } from './sale-stock-helpers'

export function registerSaleCreateHandler(): void {
  ipcMain.handle('db:sales:create', (_event, rawSaleData: unknown) => {
    const saleData = saleCreateSchema.parse(rawSaleData)
    const shopId = saleData.shopId || 'default'
    const userId = saleData.userId || 'system'
    const deviceId = saleData.deviceId || null
    const paymentMap: Record<string, { db: string; status: string }> = {
      cash: { db: 'cash', status: 'completed' },
      mpesa: { db: 'mobile_money', status: 'pending' },
      debt: { db: 'debt', status: 'completed' },
    }
    const { db: dbPaymentMethod, status: saleStatus } = paymentMap[saleData.paymentMethod] ?? { db: 'cash', status: 'completed' }
    const now = new Date().toISOString()
    const saleId = uuidv4()
    const itemsCount = (saleData.items ?? []).length
    const itemsSummary = `${itemsCount} item${itemsCount === 1 ? '' : 's'}`

    // In client mode, forward to host for validation instead of writing locally
    if (syncService.getMode() === 'client') {
      syncService.sendSalePending({
        saleId,
        items: (saleData.items ?? []).map((i: { productId?: string; quantity: number }) => ({ productId: i.productId || '', quantity: i.quantity })),
        total: saleData.totalAmount || 0,
        paymentMethod: saleData.paymentMethod || 'cash',
      })
      return { id: saleId, status: 'pending', total_amount: saleData.totalAmount, payment_method: dbPaymentMethod }
    }

    const database = getDatabase()

    database.prepare(`
      INSERT INTO sales (id, type, status, subtotal, discount_amount, tax_amount, total_amount, paid_amount, payment_method, note, items_summary, customer_id_number, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(saleId, saleData.type || 'retail', saleStatus, saleData.subtotal || 0, saleData.discountAmount || 0,
      saleData.taxAmount || 0, saleData.totalAmount || 0,
      saleData.paymentMethod === 'cash' ? (saleData.paidAmount || saleData.totalAmount || 0) : 0,
      dbPaymentMethod, saleData.note || null, itemsSummary, saleData.customerIdNumber || null, now, now)

    const insertItem = database.prepare(`
      INSERT INTO sale_items (id, sale_id, product_id, variation_name, product_name, quantity, unit_price, discount, total_price, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const inventoryTxIds: string[] = []

    for (const item of saleData.items ?? []) {
      const itemId = uuidv4()
      insertItem.run(itemId, saleId, item.productId || null, item.variationName || null,
        item.productName, item.quantity, item.unitPrice || 0, item.discount || 0,
        item.totalPrice || (item.quantity * item.unitPrice), now)

      if (item.productId) {
        const invTxId = applySaleStockDeduction(
          database,
          { productId: item.productId, quantity: item.quantity, productName: item.productName },
          saleId, shopId, deviceId, userId, now,
        )
        inventoryTxIds.push(...invTxId)
      }
    }

    // Write sync_sales record for multi-terminal sync
    database.prepare(`
      INSERT INTO sync_sales (id, shop_id, sale_id, employee_id, device_id, status, payment_method, total, items_count, payload, created_at)
      VALUES (?, ?, ?, ?, ?, 'confirmed', ?, ?, ?, ?, ?)
    `).run(uuidv4(), shopId, saleId, userId, deviceId, dbPaymentMethod, saleData.totalAmount || 0, itemsCount,
      JSON.stringify({ inventoryTxIds }), now)

    // Handle debt — create customer + debt record
    if (saleData.paymentMethod === 'debt') {
      let customerId = saleData.customerId || null
      if (!customerId && (saleData.customerName || saleData.customerPhone)) {
        const custId = uuidv4()
        database.prepare(`INSERT INTO customers (id, name, phone, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`)
          .run(custId, saleData.customerName || 'Unknown', saleData.customerPhone || null, now, now)
        customerId = custId
      }
      if (customerId) {
        database.prepare(`INSERT INTO debts (id, customer_id, sale_id, amount, amount_paid, status, notes, created_at, updated_at)
          VALUES (?, ?, ?, ?, 0, 'pending', ?, ?, ?)`)
          .run(uuidv4(), customerId, saleId, saleData.totalAmount, saleData.note || null, now, now)
      }
    }

    log.info(`Sale created: ${saleId}, total: ${saleData.totalAmount}, payment: ${dbPaymentMethod}`)

    // Audit log
    const auditPayload = JSON.stringify({ saleId, total: saleData.totalAmount, payment: dbPaymentMethod, itemsCount })
    try {
      database.prepare(`INSERT INTO audit_logs (id, shop_id, user_id, device_id, action, entity_type, entity_id, payload, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(uuidv4(), shopId, userId, deviceId, 'sale_created', 'sale', saleId, auditPayload, now)
    } catch { log.warn('Failed to write sale audit log') }

    pushSale(saleId).catch(() => {})
    return database.prepare('SELECT * FROM sales WHERE id = ?').get(saleId)
  })
}
