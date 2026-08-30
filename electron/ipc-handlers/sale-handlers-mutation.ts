import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'
import { saleCreateSchema, heldSaleCreateSchema } from './validation'
import { getMainWindow } from '../window-manager'

interface ProductStockRow { name: string; stock_quantity: number | null; track_inventory: number | null; low_stock_threshold: number | null }
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
    const database = getDatabase()
    const saleId = uuidv4()
    const now = new Date().toISOString()
    const paymentMethodMap: Record<string, string> = { cash: 'cash', mpesa: 'mobile_money', debt: 'debt' }
    const statusMap: Record<string, string> = { cash: 'completed', mpesa: 'pending', debt: 'completed' }
    const dbPaymentMethod = paymentMethodMap[saleData.paymentMethod] || saleData.paymentMethod || 'cash'
    const saleStatus = saleData.status || statusMap[dbPaymentMethod] || 'completed'
    const itemsCount = (saleData.items || []).length
    const itemsSummary = `${itemsCount} item${itemsCount === 1 ? '' : 's'}`

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
    const updateStock = database.prepare(`UPDATE products SET stock_quantity = stock_quantity - ?, updated_at = ? WHERE id = ?`)

    for (const item of saleData.items || []) {
      const itemId = uuidv4()
      insertItem.run(itemId, saleId, item.productId || null, item.variationName || null,
        item.productName, item.quantity, item.unitPrice || 0, item.discount || 0,
        item.totalPrice || (item.quantity * item.unitPrice), now)
      if (item.productId) {
        updateStock.run(item.quantity, now, item.productId)
        const product = database.prepare('SELECT name, stock_quantity, track_inventory, low_stock_threshold FROM products WHERE id = ?').get(item.productId) as ProductStockRow | undefined
        const movementId = uuidv4()
        database.prepare(`INSERT INTO stock_movements (id, product_id, type, quantity, balance_after, reason, reference_id, created_at)
          VALUES (?, ?, 'sale', ?, ?, ?, ?, ?)`).run(movementId, item.productId, -item.quantity,
            product?.stock_quantity || 0, 'Sale', saleId, now)
        // Fire low-stock notification if product is tracked and below threshold
        if (product && product.track_inventory && product.low_stock_threshold != null) {
          const remaining = (product.stock_quantity || 0) - item.quantity
          if (remaining <= (product.low_stock_threshold || 0) && remaining >= 0) {
            getMainWindow()?.webContents.send('notification:low-stock', {
              productName: product.name,
              stock: remaining,
            })
          }
        }
      }
    }

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
    return db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId)
  })

  // Held Sales
  ipcMain.handle('db:held-sales:list', (_event, _shopId?: string) => {
    return getDatabase().prepare('SELECT * FROM held_sales ORDER BY created_at DESC').all()
  })

  ipcMain.handle('db:held-sales:create', (_event, rawSaleData: unknown) => {
    const saleData = heldSaleCreateSchema.parse(rawSaleData)
    const db = getDatabase()
    const id = uuidv4()
    const now = new Date().toISOString()
    db.prepare(`INSERT INTO held_sales (id, name, cart_items, payment_method, created_at) VALUES (?, ?, ?, ?, ?)`)
      .run(id, saleData.name || `Sale ${new Date().toLocaleTimeString()}`, JSON.stringify(saleData.cartItems), saleData.paymentMethod || 'cash', now)
    return db.prepare('SELECT * FROM held_sales WHERE id = ?').get(id)
  })

  ipcMain.handle('db:held-sales:delete', (_event, id: string) => {
    getDatabase().prepare('DELETE FROM held_sales WHERE id = ?').run(id)
  })

  ipcMain.handle('db:held-sales:restore', (_event, id: string) => {
    const heldSale = getDatabase().prepare('SELECT * FROM held_sales WHERE id = ?').get(id) as HeldSaleRow | undefined
    if (heldSale) return { ...heldSale, cartItems: JSON.parse(heldSale.cart_items) }
    return null
  })

  log.info('Sale mutation handlers registered')
}
