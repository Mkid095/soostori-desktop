import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'
import { saleCreateSchema, heldSaleCreateSchema } from './validation'
import { getMainWindow } from '../window-manager'
import { syncService } from '../sync/sync-service'

interface ProductStockRow { name: string; stock: number; track_inventory: number | null; low_stock_threshold: number | null }
interface HeldSaleRow { id: string; name: string | null; cart_items: string; payment_method: string | null; created_at: string }

export function registerSaleMutationHandlers(): void {
  // Ensure items_summary and customer_id_number columns exist for older DBs
  const db = getDatabase()
  const tableInfo = db.prepare(`PRAGMA table_info(sales)`).all() as Array<{ name: string }>
  if (!tableInfo.some(c => c.name === 'items_summary')) {
    db.exec(`ALTER TABLE sales ADD COLUMN items_summary TEXT`)
  }
  if (!tableInfo.some(c => c.name === 'customer_id_number')) {
    db.exec(`ALTER TABLE sales ADD COLUMN customer_id_number TEXT`)
  }

  ipcMain.handle('db:sales:create', (_event, rawSaleData: unknown) => {
    const saleData = saleCreateSchema.parse(rawSaleData)
    const shopId = (saleData as { shopId?: string }).shopId || 'default'
    const userId = (saleData as { userId?: string }).userId || 'system'
    const deviceId = (saleData as { deviceId?: string }).deviceId || null
    const paymentMap: Record<string, { db: string; status: string }> = {
      cash: { db: 'cash', status: 'completed' },
      mpesa: { db: 'mobile_money', status: 'pending' },
      debt: { db: 'debt', status: 'completed' },
    }
    const { db: dbPaymentMethod, status: saleStatus } = paymentMap[saleData.paymentMethod] || { db: 'cash', status: 'completed' }
    const now = new Date().toISOString()
    const saleId = uuidv4()
    const itemsCount = (saleData.items || []).length
    const itemsSummary = `${itemsCount} item${itemsCount === 1 ? '' : 's'}`

    // In client mode, send to host for validation instead of writing locally
    if (syncService.getMode() === 'client') {
      syncService.sendSalePending({
        saleId,
        items: (saleData.items || []).map((i: { productId?: string; quantity: number }) => ({ productId: i.productId || '', quantity: i.quantity })),
        total: saleData.totalAmount || 0,
        paymentMethod: saleData.paymentMethod || 'cash',
      })
      return { id: saleId, status: 'pending', total_amount: saleData.totalAmount, payment_method: dbPaymentMethod }
    }
    const database = db

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

    for (const item of saleData.items || []) {
      const itemId = uuidv4()
      insertItem.run(itemId, saleId, item.productId || null, item.variationName || null,
        item.productName, item.quantity, item.unitPrice || 0, item.discount || 0,
        item.totalPrice || (item.quantity * item.unitPrice), now)
      if (item.productId) {
        // Use current_stock (cached speed layer) for stock deduction
        const product = database.prepare(
          'SELECT name, COALESCE(current_stock, stock_quantity) as stock, track_inventory, low_stock_threshold FROM products WHERE id = ?'
        ).get(item.productId) as ProductStockRow | undefined
        if (product) {
          const newStock = product.stock - item.quantity
          database.prepare('UPDATE products SET current_stock = ?, stock_quantity = ?, updated_at = ? WHERE id = ?')
            .run(newStock, newStock, now, item.productId)
          const movementId = uuidv4()
          database.prepare(`INSERT INTO stock_movements (id, product_id, type, quantity, balance_after, reason, reference_id, created_at)
            VALUES (?, ?, 'sale', ?, ?, ?, ?, ?)`).run(movementId, item.productId, -item.quantity,
              newStock, 'Sale', saleId, now)
          // Write inventory transaction for sync
          const invTxId = uuidv4()
          inventoryTxIds.push(invTxId)
          database.prepare(`
            INSERT INTO inventory_transactions
              (id, shop_id, product_id, device_id, user_id, event_type, quantity, balance_after, status, created_at)
            VALUES (?, ?, ?, ?, ?, 'sale', ?, ?, 'confirmed', ?)
          `).run(invTxId, shopId, item.productId, deviceId, userId, -item.quantity, newStock, now)
          // Fire low-stock notification if product is tracked and below threshold
          if (product.track_inventory && product.low_stock_threshold != null) {
            if (newStock <= (product.low_stock_threshold || 0) && newStock >= 0) {
              getMainWindow()?.webContents.send('notification:low-stock', {
                productName: product.name,
                stock: newStock,
              })
            }
          }
        }
      }
    }

    // Write sync_sales record for multi-terminal sync
    const syncSaleId = uuidv4()
    database.prepare(`
      INSERT INTO sync_sales (id, shop_id, sale_id, employee_id, device_id, status, payment_method, total, items_count, payload, created_at)
      VALUES (?, ?, ?, ?, ?, 'confirmed', ?, ?, ?, ?, ?)
    `).run(
      syncSaleId, shopId, saleId, userId, deviceId,
      dbPaymentMethod, saleData.totalAmount || 0, itemsCount,
      JSON.stringify({ inventoryTxIds }), now
    )

    if (saleData.paymentMethod === 'debt') {
      let customerId = saleData.customerId || null
      if (!customerId && (saleData.customerName || saleData.customerPhone)) {
        const custId = uuidv4()
        db.prepare(`INSERT INTO customers (id, name, phone, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`)
          .run(custId, saleData.customerName || 'Unknown', saleData.customerPhone || null, now, now)
        customerId = custId
      }
      if (customerId) {
        const debtId = uuidv4()
        db.prepare(`INSERT INTO debts (id, customer_id, sale_id, amount, amount_paid, status, notes, created_at, updated_at)
          VALUES (?, ?, ?, ?, 0, 'pending', ?, ?, ?)`)
          .run(debtId, customerId, saleId, saleData.totalAmount, saleData.note || null, now, now)
      }
    }
    log.info(`Sale created: ${saleId}, total: ${saleData.totalAmount}, payment: ${dbPaymentMethod}`)

    // Audit log sale creation
    const saleAuditPayload = JSON.stringify({ saleId, total: saleData.totalAmount, payment: dbPaymentMethod, itemsCount })
    try {
      database.prepare(`INSERT INTO audit_logs (id, shop_id, user_id, device_id, action, entity_type, entity_id, payload, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(uuidv4(), shopId, userId, deviceId, 'sale_created', 'sale', saleId, saleAuditPayload, now)
    } catch { log.warn('Failed to write sale audit log') }

    return database.prepare('SELECT * FROM sales WHERE id = ?').get(saleId)
  })

  // Held Sales
  ipcMain.handle('db:held-sales:list', () => getDatabase().prepare('SELECT * FROM held_sales ORDER BY created_at DESC').all())
  ipcMain.handle('db:held-sales:create', (_event, rawSaleData: unknown) => {
    const saleData = heldSaleCreateSchema.parse(rawSaleData)
    const db = getDatabase()
    const id = uuidv4()
    const now = new Date().toISOString()
    db.prepare(`INSERT INTO held_sales (id, name, cart_items, payment_method, created_at) VALUES (?, ?, ?, ?, ?)`)
      .run(id, saleData.name || `Sale ${new Date().toLocaleTimeString()}`, JSON.stringify(saleData.cartItems), saleData.paymentMethod || 'cash', now)
    return db.prepare('SELECT * FROM held_sales WHERE id = ?').get(id)
  })
  ipcMain.handle('db:held-sales:delete', (_event, id: string) => { getDatabase().prepare('DELETE FROM held_sales WHERE id = ?').run(id) })
  ipcMain.handle('db:held-sales:restore', (_event, id: string) => {
    const heldSale = getDatabase().prepare('SELECT * FROM held_sales WHERE id = ?').get(id) as HeldSaleRow | undefined
    return heldSale ? { ...heldSale, cartItems: JSON.parse(heldSale.cart_items) } : null
  })

  log.info('Sale mutation handlers registered')
}
