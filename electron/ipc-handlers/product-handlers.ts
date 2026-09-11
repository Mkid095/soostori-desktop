import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import log from 'electron-log'
import { productCreateSchema, productUpdateSchema } from './validation'
import { registerProductQueryHandlers } from './product-handlers-query'
import { registerProductMutationHandlers } from './product-handlers-mutation'
import { pushProduct } from '../services/cloud-entity-sync'
import { ProductsRepository } from '@soostori/desktop-adapter'

export { registerProductQueryHandlers }

const productsRepo = new ProductsRepository()

export function registerProductHandlers(): void {
  registerProductQueryHandlers()
  registerProductMutationHandlers()

  ipcMain.handle('db:products:create', async (_event, rawData: unknown) => {
    const data = productCreateSchema.parse(rawData)
    const product = await productsRepo.create({
      name: data.name,
      sku: data.sku || null,
      barcode: data.barcode || null,
      description: data.description || null,
      image: data.imageUrl || null,
      categoryId: data.categoryId || null,
      costPrice: data.costPrice ?? 0,
      sellingPrice: data.sellingPrice,
      discountPrice: data.discountPrice ?? null,
      unit: data.unit || 'piece',
      stockQuantity: data.stockQuantity ?? 0,
      lowStockThreshold: data.lowStockThreshold ?? 5,
      trackInventory: data.trackInventory ?? true,
      hasVariants: data.hasVariants ?? false,
      expiryDate: data.expiryDate || null,
      metadata: data.metadata,
      distributorName: data.distributorName || null,
      distributorPhone: data.distributorPhone || null,
      allowSingleUnitSale: data.allowSingleUnitSale ?? true,
      unitsPerPackage: data.unitsPerPackage ?? null,
      boxBuyingPrice: data.boxBuyingPrice ?? null,
      bulkSellingPrice: data.bulkSellingPrice ?? null,
      groupPrices: data.groupPrices ?? null,
      isActive: true,
    })
    // Push to cloud (fire-and-forget)
    pushProduct(product.id).catch(() => {})
    return getDatabase().prepare('SELECT * FROM products WHERE id = ?').get(product.id)
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
    pushProduct(id).catch(() => {})
    return db.prepare('SELECT * FROM products WHERE id = ?').get(id)
  })

  ipcMain.handle('db:products:delete', (_event, id: string) => {
    const now = new Date().toISOString()
    getDatabase().prepare('UPDATE products SET deleted_at = ?, is_active = 0 WHERE id = ?').run(now, id)
    pushProduct(id).catch(() => {})
  })

  log.info('Product mutation handlers registered')
}
