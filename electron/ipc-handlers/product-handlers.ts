import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'
import { productCreateSchema, productUpdateSchema } from './validation'
import { registerProductQueryHandlers } from './product-handlers-query'

export { registerProductQueryHandlers }

export function registerProductHandlers(): void {
  registerProductQueryHandlers()

  ipcMain.handle('db:products:create', (_event, rawData: unknown) => {
    const data = productCreateSchema.parse(rawData)
    const db = getDatabase()
    const id = uuidv4()
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO products (id, category_id, name, sku, barcode, description, image_url, cost_price, selling_price,
        discount_price, unit, stock_quantity, low_stock_threshold, track_inventory, has_variants,
        parent_variant_id, expiry_date, metadata, is_active, distributor_name, distributor_phone,
        barcode_generated, allow_single_unit_sale, units_per_package, box_buying_price,
        bulk_selling_price, group_prices, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.categoryId || null, data.name, data.sku || null, data.barcode || null,
      data.description || null, data.imageUrl || null, data.costPrice ?? 0, data.sellingPrice,
      data.discountPrice ?? null, data.unit || 'piece', data.stockQuantity ?? 0,
      data.lowStockThreshold ?? 5, data.trackInventory ? 1 : 0, data.hasVariants ? 1 : 0,
      null, data.expiryDate || null, data.metadata ? JSON.stringify(data.metadata) : null, 1,
      data.distributorName || null, data.distributorPhone || null,
      data.barcodeGenerated ? 1 : 0,
      data.allowSingleUnitSale !== undefined ? (data.allowSingleUnitSale ? 1 : 0) : 1,
      data.unitsPerPackage ?? null, data.boxBuyingPrice ?? null, data.bulkSellingPrice ?? null,
      data.groupPrices ? JSON.stringify(data.groupPrices) : null, now, now)
    return db.prepare('SELECT * FROM products WHERE id = ?').get(id)
  })

  ipcMain.handle('db:products:update', (_event, id: string, rawData: unknown) => {
    const data = productUpdateSchema.parse(rawData)
    const db = getDatabase()
    const now = new Date().toISOString()
    const fields: string[] = []
    const values: (string | number | null)[] = []
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
    if (data.categoryId !== undefined) { fields.push('category_id = ?'); values.push(data.categoryId || null) }
    if (data.sku !== undefined) { fields.push('sku = ?'); values.push(data.sku || null) }
    if (data.barcode !== undefined) { fields.push('barcode = ?'); values.push(data.barcode || null) }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description || null) }
    if (data.imageUrl !== undefined) { fields.push('image_url = ?'); values.push(data.imageUrl || null) }
    if (data.costPrice !== undefined) { fields.push('cost_price = ?'); values.push(data.costPrice ?? 0) }
    if (data.sellingPrice !== undefined) { fields.push('selling_price = ?'); values.push(data.sellingPrice) }
    if (data.discountPrice !== undefined) { fields.push('discount_price = ?'); values.push(data.discountPrice ?? null) }
    if (data.unit !== undefined) { fields.push('unit = ?'); values.push(data.unit || null) }
    if (data.stockQuantity !== undefined) { fields.push('stock_quantity = ?'); values.push(data.stockQuantity ?? 0) }
    if (data.lowStockThreshold !== undefined) { fields.push('low_stock_threshold = ?'); values.push(data.lowStockThreshold ?? 5) }
    if (data.trackInventory !== undefined) { fields.push('track_inventory = ?'); values.push(data.trackInventory ? 1 : 0) }
    if (data.hasVariants !== undefined) { fields.push('has_variants = ?'); values.push(data.hasVariants ? 1 : 0) }
    if (data.expiryDate !== undefined) { fields.push('expiry_date = ?'); values.push(data.expiryDate || null) }
    if (data.metadata !== undefined) { fields.push('metadata = ?'); values.push(data.metadata ? JSON.stringify(data.metadata) : null) }
    if (data.distributorName !== undefined) { fields.push('distributor_name = ?'); values.push(data.distributorName || null) }
    if (data.distributorPhone !== undefined) { fields.push('distributor_phone = ?'); values.push(data.distributorPhone || null) }
    if (data.barcodeGenerated !== undefined) { fields.push('barcode_generated = ?'); values.push(data.barcodeGenerated ? 1 : 0) }
    if (data.allowSingleUnitSale !== undefined) { fields.push('allow_single_unit_sale = ?'); values.push(data.allowSingleUnitSale ? 1 : 0) }
    if (data.unitsPerPackage !== undefined) { fields.push('units_per_package = ?'); values.push(data.unitsPerPackage ?? null) }
    if (data.boxBuyingPrice !== undefined) { fields.push('box_buying_price = ?'); values.push(data.boxBuyingPrice ?? null) }
    if (data.bulkSellingPrice !== undefined) { fields.push('bulk_selling_price = ?'); values.push(data.bulkSellingPrice ?? null) }
    if (data.groupPrices !== undefined) { fields.push('group_prices = ?'); values.push(data.groupPrices ? JSON.stringify(data.groupPrices) : null) }
    fields.push('updated_at = ?')
    values.push(now, id)
    db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return db.prepare('SELECT * FROM products WHERE id = ?').get(id)
  })

  ipcMain.handle('db:products:delete', (_event, id: string) => {
    const now = new Date().toISOString()
    getDatabase().prepare('UPDATE products SET deleted_at = ?, is_active = 0 WHERE id = ?').run(now, id)
  })

  log.info('Product mutation handlers registered')
}
