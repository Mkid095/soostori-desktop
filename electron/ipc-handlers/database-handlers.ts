import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'

export function registerDatabaseHandlers(): void {
  // ========== PRODUCTS ==========

  ipcMain.handle('db:products:list', (_event, shopId?: string) => {
    const db = getDatabase()
    const products = db.prepare(`
      SELECT p.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.deleted_at IS NULL AND p.is_active = 1
      ORDER BY p.name ASC
    `).all()
    return products
  })

  ipcMain.handle('db:products:get', (_event, id: string) => {
    const db = getDatabase()
    const product = db.prepare(`
      SELECT p.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `).get(id)
    return product
  })

  ipcMain.handle('db:products:getByBarcode', (_event, barcode: string) => {
    const db = getDatabase()
    const normalizedBarcode = barcode.trim().toUpperCase()
    const product = db.prepare(`
      SELECT p.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE UPPER(TRIM(p.barcode)) = ? AND p.deleted_at IS NULL AND p.is_active = 1
    `).get(normalizedBarcode)
    return product
  })

  ipcMain.handle('db:products:create', (_event, productData: any) => {
    const db = getDatabase()
    const id = uuidv4()
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO products (
        id, category_id, name, sku, barcode, description, image_url,
        cost_price, selling_price, discount_price, unit, stock_quantity,
        low_stock_threshold, track_inventory, has_variants, parent_variant_id,
        expiry_date, metadata, is_active,
        distributor_name, distributor_phone, barcode_generated,
        allow_single_unit_sale, units_per_package, box_buying_price,
        bulk_selling_price, group_prices,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      productData.categoryId || null,
      productData.name,
      productData.sku || null,
      productData.barcode || null,
      productData.description || null,
      productData.imageUrl || null,
      productData.costPrice || 0,
      productData.sellingPrice,
      productData.discountPrice || null,
      productData.unit || 'piece',
      productData.stockQuantity || 0,
      productData.lowStockThreshold || 5,
      productData.trackInventory ? 1 : 0,
      productData.hasVariants ? 1 : 0,
      null,
      productData.expiryDate || null,
      productData.metadata ? JSON.stringify(productData.metadata) : null,
      1,
      productData.distributorName || null,
      productData.distributorPhone || null,
      productData.barcodeGenerated ? 1 : 0,
      productData.allowSingleUnitSale !== undefined ? (productData.allowSingleUnitSale ? 1 : 0) : 1,
      productData.unitsPerPackage || null,
      productData.boxBuyingPrice || null,
      productData.bulkSellingPrice || null,
      productData.groupPrices ? JSON.stringify(productData.groupPrices) : null,
      now,
      now
    )
    return db.prepare('SELECT * FROM products WHERE id = ?').get(id)
  })

  ipcMain.handle('db:products:update', (_event, id: string, data: any) => {
    const db = getDatabase()
    const now = new Date().toISOString()

    const fields: string[] = []
    const values: any[] = []

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
    if (data.categoryId !== undefined) { fields.push('category_id = ?'); values.push(data.categoryId) }
    if (data.sku !== undefined) { fields.push('sku = ?'); values.push(data.sku) }
    if (data.barcode !== undefined) { fields.push('barcode = ?'); values.push(data.barcode) }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description) }
    if (data.imageUrl !== undefined) { fields.push('image_url = ?'); values.push(data.imageUrl) }
    if (data.costPrice !== undefined) { fields.push('cost_price = ?'); values.push(data.costPrice) }
    if (data.sellingPrice !== undefined) { fields.push('selling_price = ?'); values.push(data.sellingPrice) }
    if (data.discountPrice !== undefined) { fields.push('discount_price = ?'); values.push(data.discountPrice) }
    if (data.unit !== undefined) { fields.push('unit = ?'); values.push(data.unit) }
    if (data.stockQuantity !== undefined) { fields.push('stock_quantity = ?'); values.push(data.stockQuantity) }
    if (data.lowStockThreshold !== undefined) { fields.push('low_stock_threshold = ?'); values.push(data.lowStockThreshold) }
    if (data.trackInventory !== undefined) { fields.push('track_inventory = ?'); values.push(data.trackInventory ? 1 : 0) }
    if (data.hasVariants !== undefined) { fields.push('has_variants = ?'); values.push(data.hasVariants ? 1 : 0) }
    if (data.expiryDate !== undefined) { fields.push('expiry_date = ?'); values.push(data.expiryDate) }
    if (data.metadata !== undefined) { fields.push('metadata = ?'); values.push(JSON.stringify(data.metadata)) }
    // Full product fields
    if (data.distributorName !== undefined) { fields.push('distributor_name = ?'); values.push(data.distributorName) }
    if (data.distributorPhone !== undefined) { fields.push('distributor_phone = ?'); values.push(data.distributorPhone) }
    if (data.barcodeGenerated !== undefined) { fields.push('barcode_generated = ?'); values.push(data.barcodeGenerated ? 1 : 0) }
    if (data.allowSingleUnitSale !== undefined) { fields.push('allow_single_unit_sale = ?'); values.push(data.allowSingleUnitSale ? 1 : 0) }
    if (data.unitsPerPackage !== undefined) { fields.push('units_per_package = ?'); values.push(data.unitsPerPackage) }
    if (data.boxBuyingPrice !== undefined) { fields.push('box_buying_price = ?'); values.push(data.boxBuyingPrice) }
    if (data.bulkSellingPrice !== undefined) { fields.push('bulk_selling_price = ?'); values.push(data.bulkSellingPrice) }
    if (data.groupPrices !== undefined) { fields.push('group_prices = ?'); values.push(data.groupPrices ? JSON.stringify(data.groupPrices) : null) }

    fields.push('updated_at = ?')
    values.push(now)
    values.push(id)

    db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return db.prepare('SELECT * FROM products WHERE id = ?').get(id)
  })

  ipcMain.handle('db:products:delete', (_event, id: string) => {
    const db = getDatabase()
    const now = new Date().toISOString()
    db.prepare('UPDATE products SET deleted_at = ?, is_active = 0 WHERE id = ?').run(now, id)
  })

  ipcMain.handle('db:products:search', (_event, query: string, shopId?: string) => {
    const db = getDatabase()
    const searchPattern = `%${query}%`
    const products = db.prepare(`
      SELECT p.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.deleted_at IS NULL AND p.is_active = 1
        AND (p.name LIKE ? OR p.barcode LIKE ? OR p.sku LIKE ?)
      ORDER BY p.name ASC
      LIMIT 50
    `).all(searchPattern, searchPattern, searchPattern)
    return products
  })

  // Barcode lookup - check if barcode exists (returns info about product if found)
  ipcMain.handle('db:products:lookupBarcode', (_event, barcode: string) => {
    const db = getDatabase()
    const normalizedBarcode = barcode.trim().toUpperCase()
    const product = db.prepare(`
      SELECT p.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE UPPER(TRIM(p.barcode)) = ?
    `).get(normalizedBarcode)
    return product || null
  })

  // ========== CATEGORIES ==========

  ipcMain.handle('db:categories:list', (_event, shopId?: string) => {
    const db = getDatabase()
    return db.prepare(`
      SELECT * FROM categories WHERE is_active = 1 ORDER BY display_order ASC, name ASC
    `).all()
  })

  ipcMain.handle('db:categories:create', (_event, categoryData: any) => {
    const db = getDatabase()
    const id = uuidv4()
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO categories (id, name, description, icon, color, display_order, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      id,
      categoryData.name,
      categoryData.description || null,
      categoryData.icon || null,
      categoryData.color || '#6366f1',
      categoryData.displayOrder || 0,
      now,
      now
    )

    return db.prepare('SELECT * FROM categories WHERE id = ?').get(id)
  })

  ipcMain.handle('db:categories:update', (_event, id: string, data: any) => {
    const db = getDatabase()
    const now = new Date().toISOString()

    const fields: string[] = []
    const values: any[] = []

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description) }
    if (data.icon !== undefined) { fields.push('icon = ?'); values.push(data.icon) }
    if (data.color !== undefined) { fields.push('color = ?'); values.push(data.color) }
    if (data.displayOrder !== undefined) { fields.push('display_order = ?'); values.push(data.displayOrder) }
    if (data.isActive !== undefined) { fields.push('is_active = ?'); values.push(data.isActive ? 1 : 0) }

    fields.push('updated_at = ?')
    values.push(now)
    values.push(id)

    db.prepare(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return db.prepare('SELECT * FROM categories WHERE id = ?').get(id)
  })

  ipcMain.handle('db:categories:delete', (_event, id: string) => {
    const db = getDatabase()
    db.prepare('UPDATE categories SET is_active = 0 WHERE id = ?').run(id)
  })

  // ========== SALES ==========

  ipcMain.handle('db:sales:list', (_event, shopId?: string, limit: number = 100) => {
    const db = getDatabase()
    const sales = db.prepare(`
      SELECT s.*, GROUP_CONCAT(si.product_name || ' x' || si.quantity) as items_summary
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id
      GROUP BY s.id
      ORDER BY s.created_at DESC
      LIMIT ?
    `).all(limit)
    return sales
  })

  ipcMain.handle('db:sales:get', (_event, id: string) => {
    const db = getDatabase()
    const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(id)
    if (sale) {
      const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(id)
      return { ...sale, items }
    }
    return null
  })

  ipcMain.handle('db:sales:create', (_event, saleData: any) => {
    const db = getDatabase()
    const saleId = uuidv4()
    const now = new Date().toISOString()

    // Map payment methods to DB values
    const paymentMethodMap: Record<string, string> = {
      cash: 'cash',
      mpesa: 'mobile_money',
      debt: 'debt',
    }
    const dbPaymentMethod = paymentMethodMap[saleData.paymentMethod] || saleData.paymentMethod || 'cash'

    // For mpesa, status is pending until confirmed; for cash/debt it's completed
    const statusMap: Record<string, string> = {
      cash: 'completed',
      mpesa: 'pending',
      debt: 'completed',
    }
    const saleStatus = saleData.status || statusMap[dbPaymentMethod] || 'completed'

    const insertSale = db.prepare(`
      INSERT INTO sales (id, type, status, subtotal, discount_amount, tax_amount, total_amount, paid_amount, payment_method, note, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    insertSale.run(
      saleId,
      saleData.type || 'retail',
      saleStatus,
      saleData.subtotal || 0,
      saleData.discountAmount || 0,
      saleData.taxAmount || 0,
      saleData.totalAmount || 0,
      saleData.paymentMethod === 'cash' ? (saleData.paidAmount || saleData.totalAmount || 0) : 0,
      dbPaymentMethod,
      saleData.note || null,
      now,
      now
    )

    // Insert sale items
    const insertItem = db.prepare(`
      INSERT INTO sale_items (id, sale_id, product_id, variation_name, product_name, quantity, unit_price, discount, total_price, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const updateStock = db.prepare(`
      UPDATE products SET stock_quantity = stock_quantity - ?, updated_at = ? WHERE id = ?
    `)

    for (const item of saleData.items || []) {
      const itemId = uuidv4()
      insertItem.run(
        itemId,
        saleId,
        item.productId || null,
        item.variationName || null,
        item.productName,
        item.quantity,
        item.unitPrice || 0,
        item.discount || 0,
        item.totalPrice || (item.quantity * item.unitPrice),
        now
      )

      // Deduct stock if product_id exists and tracking is enabled
      if (item.productId) {
        updateStock.run(item.quantity, now, item.productId)

        // Record stock movement
        const product = db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(item.productId) as any
        const movementId = uuidv4()
        db.prepare(`
          INSERT INTO stock_movements (id, product_id, type, quantity, balance_after, reason, reference_id, created_at)
          VALUES (?, ?, 'sale', ?, ?, ?, ?, ?)
        `).run(
          movementId,
          item.productId,
          -item.quantity,
          product?.stock_quantity || 0,
          'Sale',
          saleId,
          now
        )
      }
    }

    // If debt payment, create a debt record (and optionally a new customer)
    if (saleData.paymentMethod === 'debt') {
      let customerId = saleData.customerId || null

      // If we have a new customer name/phone but no ID, create the customer first
      if (!customerId && (saleData.customerName || saleData.customerPhone)) {
        const custId = uuidv4()
        db.prepare(`
          INSERT INTO customers (id, name, phone, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(custId, saleData.customerName || 'Unknown', saleData.customerPhone || null, now, now)
        customerId = custId
        log.info(`New customer created for debt: ${custId} - ${saleData.customerName}`)
      }

      if (customerId) {
        const debtId = uuidv4()
        db.prepare(`
          INSERT INTO debts (id, customer_id, sale_id, amount, amount_paid, status, notes, created_at, updated_at)
          VALUES (?, ?, ?, ?, 0, 'pending', ?, ?, ?)
        `).run(debtId, customerId, saleId, saleData.totalAmount, saleData.note || null, now, now)
        log.info(`Debt recorded: ${debtId} for customer ${customerId}, amount ${saleData.totalAmount}`)
      }
    }

    log.info(`Sale created: ${saleId}, total: ${saleData.totalAmount}, payment: ${dbPaymentMethod}, status: ${saleStatus}`)
    return db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId)
  })

  ipcMain.handle('db:sales:listByDateRange', (_event, startDate: string, endDate: string, shopId?: string) => {
    const db = getDatabase()
    return db.prepare(`
      SELECT * FROM sales
      WHERE created_at >= ? AND created_at <= ?
      ORDER BY created_at DESC
    `).all(startDate, endDate)
  })

  // ========== HELD SALES ==========

  ipcMain.handle('db:held-sales:list', (_event, shopId?: string) => {
    const db = getDatabase()
    return db.prepare('SELECT * FROM held_sales ORDER BY created_at DESC').all()
  })

  ipcMain.handle('db:held-sales:create', (_event, saleData: any) => {
    const db = getDatabase()
    const id = uuidv4()
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO held_sales (id, name, cart_items, payment_method, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, saleData.name || `Sale ${new Date().toLocaleTimeString()}`, JSON.stringify(saleData.cartItems), saleData.paymentMethod || 'cash', now)

    return db.prepare('SELECT * FROM held_sales WHERE id = ?').get(id)
  })

  ipcMain.handle('db:held-sales:delete', (_event, id: string) => {
    const db = getDatabase()
    db.prepare('DELETE FROM held_sales WHERE id = ?').run(id)
  })

  ipcMain.handle('db:held-sales:restore', (_event, id: string) => {
    const db = getDatabase()
    const heldSale = db.prepare('SELECT * FROM held_sales WHERE id = ?').get(id) as any
    if (heldSale) {
      return { ...heldSale, cartItems: JSON.parse(heldSale.cart_items) }
    }
    return null
  })

  // ========== INVENTORY / STOCK ==========

  ipcMain.handle('db:inventory:adjust', (_event, productId: string, quantityChange: number, reason: string) => {
    const db = getDatabase()
    const id = uuidv4()
    const now = new Date().toISOString()

    // Get current stock
    const product = db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(productId) as any
    if (!product) throw new Error('Product not found')

    const newQuantity = product.stock_quantity + quantityChange
    if (newQuantity < 0) throw new Error('Insufficient stock')

    // Update product stock
    db.prepare('UPDATE products SET stock_quantity = ?, updated_at = ? WHERE id = ?').run(newQuantity, now, productId)

    // Record movement
    db.prepare(`
      INSERT INTO stock_movements (id, product_id, type, quantity, balance_after, reason, created_at)
      VALUES (?, ?, 'adjustment', ?, ?, ?, ?)
    `).run(id, productId, quantityChange, newQuantity, reason, now)

    // Record adjustment log
    const logId = uuidv4()
    db.prepare(`
      INSERT INTO stock_adjustment_log (id, product_id, quantity_before, quantity_after, quantity_change, reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(logId, productId, product.stock_quantity, newQuantity, quantityChange, reason, now)

    return {
      productId,
      previousQuantity: product.stock_quantity,
      newQuantity,
      quantityChange,
      reason,
    }
  })

  ipcMain.handle('db:inventory:movements', (_event, productId?: string, limit: number = 100) => {
    const db = getDatabase()
    if (productId) {
      return db.prepare(`
        SELECT sm.*, p.name as product_name
        FROM stock_movements sm
        JOIN products p ON sm.product_id = p.id
        WHERE sm.product_id = ?
        ORDER BY sm.created_at DESC
        LIMIT ?
      `).all(productId, limit)
    }
    return db.prepare(`
      SELECT sm.*, p.name as product_name
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      ORDER BY sm.created_at DESC
      LIMIT ?
    `).all(limit)
  })

  // ========== SHOP SETTINGS ==========

  ipcMain.handle('db:shop-settings:get', () => {
    const db = getDatabase()
    return db.prepare('SELECT * FROM shop_settings WHERE id = ?').get('default')
  })

  ipcMain.handle('db:shop-settings:update', (_event, settings: any) => {
    const db = getDatabase()
    const now = new Date().toISOString()

    const fields: string[] = []
    const values: any[] = []

    // Map camelCase shop form fields to DB columns
    if (settings.shopName !== undefined) { fields.push('name = ?'); values.push(settings.shopName) }
    else if (settings.name !== undefined) { fields.push('name = ?'); values.push(settings.name) }
    if (settings.shopAddress !== undefined) { fields.push('address = ?'); values.push(settings.shopAddress) }
    else if (settings.address !== undefined) { fields.push('address = ?'); values.push(settings.address) }
    if (settings.shopPhone !== undefined) { fields.push('phone = ?'); values.push(settings.shopPhone) }
    else if (settings.phone !== undefined) { fields.push('phone = ?'); values.push(settings.phone) }
    if (settings.shopEmail !== undefined) { fields.push('email = ?'); values.push(settings.shopEmail) }
    else if (settings.email !== undefined) { fields.push('email = ?'); values.push(settings.email) }
    if (settings.currency !== undefined) { fields.push('currency = ?'); values.push(settings.currency) }
    if (settings.receiptFooter !== undefined) { fields.push('receipt_footer = ?'); values.push(settings.receiptFooter) }
    if (settings.lowStockThreshold !== undefined) { fields.push('low_stock_threshold = ?'); values.push(settings.lowStockThreshold) }
    if (settings.receiptPrefix !== undefined) { fields.push('receipt_prefix = ?'); values.push(settings.receiptPrefix) }
    if (settings.mpesaSendMoneyPhone !== undefined) { fields.push('mpesa_send_money_phone = ?'); values.push(settings.mpesaSendMoneyPhone) }
    if (settings.mpesaPaybillNumber !== undefined) { fields.push('mpesa_paybill_number = ?'); values.push(settings.mpesaPaybillNumber) }
    if (settings.mpesaPaybillAccount !== undefined) { fields.push('mpesa_paybill_account = ?'); values.push(settings.mpesaPaybillAccount) }
    if (settings.bankPaybillNumber !== undefined) { fields.push('bank_paybill_number = ?'); values.push(settings.bankPaybillNumber) }
    if (settings.bankPaybillAccount !== undefined) { fields.push('bank_paybill_account = ?'); values.push(settings.bankPaybillAccount) }
    if (settings.mpesaPochiPhone !== undefined) { fields.push('mpesa_pochi_phone = ?'); values.push(settings.mpesaPochiPhone) }

    fields.push('updated_at = ?')
    values.push(now)
    values.push('default')

    db.prepare(`UPDATE shop_settings SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return db.prepare('SELECT * FROM shop_settings WHERE id = ?').get('default')
  })

  // ========== CUSTOMERS ==========

  ipcMain.handle('db:customers:list', () => {
    const db = getDatabase()
    return db.prepare('SELECT * FROM customers WHERE is_active = 1 ORDER BY name ASC').all()
  })

  ipcMain.handle('db:customers:get', (_event, id: string) => {
    const db = getDatabase()
    return db.prepare('SELECT * FROM customers WHERE id = ?').get(id)
  })

  ipcMain.handle('db:customers:create', (_event, data: any) => {
    const db = getDatabase()
    const id = uuidv4()
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO customers (id, name, phone, email, address, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.name, data.phone || null, data.email || null, data.address || null, data.notes || null, now, now)
    return db.prepare('SELECT * FROM customers WHERE id = ?').get(id)
  })

  ipcMain.handle('db:customers:update', (_event, id: string, data: any) => {
    const db = getDatabase()
    const now = new Date().toISOString()
    const fields: string[] = []
    const values: any[] = []
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
    if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone) }
    if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email) }
    if (data.address !== undefined) { fields.push('address = ?'); values.push(data.address) }
    if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes) }
    fields.push('updated_at = ?'); values.push(now); values.push(id)
    db.prepare(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return db.prepare('SELECT * FROM customers WHERE id = ?').get(id)
  })

  ipcMain.handle('db:customers:delete', (_event, id: string) => {
    const db = getDatabase()
    db.prepare('UPDATE customers SET is_active = 0 WHERE id = ?').run(id)
  })

  // ========== DEBTS ==========

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

  ipcMain.handle('db:debts:create', (_event, data: any) => {
    const db = getDatabase()
    const id = uuidv4()
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO debts (id, customer_id, sale_id, amount, amount_paid, status, due_date, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, 0, 'pending', ?, ?, ?, ?)
    `).run(id, data.customerId || null, data.saleId || null, data.amount, data.dueDate || null, data.notes || null, now, now)
    return db.prepare('SELECT * FROM debts WHERE id = ?').get(id)
  })

  ipcMain.handle('db:debts:recordPayment', (_event, debtId: string, amount: number, paymentMethod: string, reference: string) => {
    const db = getDatabase()
    const now = new Date().toISOString()

    const debt = db.prepare('SELECT * FROM debts WHERE id = ?').get(debtId) as any
    if (!debt) throw new Error('Debt not found')

    const newPaid = (debt.amount_paid || 0) + amount
    const newStatus = newPaid >= debt.amount ? 'paid' : 'partial'

    db.prepare('UPDATE debts SET amount_paid = ?, status = ?, updated_at = ? WHERE id = ?')
      .run(newPaid, newStatus, now, debtId)

    const paymentId = uuidv4()
    db.prepare(`
      INSERT INTO debt_payments (id, debt_id, amount, payment_method, reference, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(paymentId, debtId, amount, paymentMethod, reference || null, now)

    return { debtId, amountPaid: newPaid, status: newStatus }
  })

  ipcMain.handle('db:debts:summary', () => {
    const db = getDatabase()
    const total = db.prepare("SELECT COALESCE(SUM(amount - amount_paid), 0) as val FROM debts WHERE status != 'paid'").get() as any
    const count = db.prepare("SELECT COUNT(*) as val FROM debts WHERE status != 'paid'").get() as any
    return { total: total?.val || 0, count: count?.val || 0 }
  })

  log.info('Database IPC handlers registered')
}
