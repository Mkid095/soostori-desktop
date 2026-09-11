import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'
import { productCreateSchema, productUpdateSchema } from './validation'
import { registerProductQueryHandlers } from './product-handlers-query'
import { registerProductMutationHandlers } from './product-handlers-mutation'
import { pushProduct } from '../services/cloud-entity-sync'
import { resolveActiveShopId } from '../database/active-shop'
import { desktopLoadSession } from '../auth/electron-store-session'
import { getRealSyncEngine } from '../sync/sync-engine'
import { buildProductSyncEvent, type ProductSyncEventContext } from '../database/sync-event-builder'
import { asBusinessId, asDeviceId, asEmployeeId } from '@soostori/core'
// Phase 04: canonical capability API
import { can, CAPABILITIES } from '@soostori/auth'
import type { Member } from '@soostori/auth'
import type { EmployeeRole } from '@soostori/core'

/** Build a Member for the capability system from the session's employeeId. */
function getCallerMember(session: { employeeId: string }): Member {
  const db = getDatabase()
  const row = db.prepare('SELECT role FROM employees WHERE id = ?').get(session.employeeId) as { role: string } | undefined
  return { role: (row?.role ?? 'cashier') as EmployeeRole }
}

export { registerProductQueryHandlers }

export function registerProductHandlers(): void {
  registerProductQueryHandlers()
  registerProductMutationHandlers()

  ipcMain.handle('db:products:create', async (_event, rawData: unknown) => {
    const session = await desktopLoadSession()
    if (!session) throw new Error('Not authenticated')
    // Phase 04: capability enforcement
    if (!can(getCallerMember(session), CAPABILITIES.PRODUCTS_CREATE)) {
      throw new Error('Insufficient permissions: products.create required')
    }
    const data = productCreateSchema.parse(rawData)
    const db = getDatabase()
    const id = uuidv4()
    const now = new Date().toISOString()
    const shopId = await resolveActiveShopId()
    db.prepare(`
      INSERT INTO products (id, category_id, name, sku, barcode, description, image_url, cost_price, selling_price,
        discount_price, unit, stock_quantity, low_stock_threshold, track_inventory, has_variants,
        parent_variant_id, expiry_date, metadata, is_active, distributor_name, distributor_phone,
        barcode_generated, allow_single_unit_sale, units_per_package, box_buying_price,
        bulk_selling_price, group_prices, shop_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.categoryId || null, data.name, data.sku || null, data.barcode || null,
      data.description || null, data.imageUrl || null, data.costPrice ?? 0, data.sellingPrice,
      data.discountPrice ?? null, data.unit || 'piece', data.stockQuantity ?? 0,
      data.lowStockThreshold ?? 5, data.trackInventory ? 1 : 0, data.hasVariants ? 1 : 0,
      null, data.expiryDate || null, data.metadata ? JSON.stringify(data.metadata) : null, 1,
      data.distributorName || null, data.distributorPhone || null,
      data.barcodeGenerated ? 1 : 0,
      data.allowSingleUnitSale !== undefined ? (data.allowSingleUnitSale ? 1 : 0) : 1,
      data.unitsPerPackage ?? null, data.boxBuyingPrice ?? null, data.bulkSellingPrice ?? null,
      data.groupPrices ? JSON.stringify(data.groupPrices) : null, shopId, now, now)

    // Phase 08: enqueue product.created sync event
    const productRow = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as Record<string, unknown>
    const syncCtx: ProductSyncEventContext = {
      businessId: asBusinessId(shopId),
      originatingDeviceId: asDeviceId(session?.deviceId ?? 'desktop'),
      originatingEmployeeId: asEmployeeId(session?.employeeId ?? ''),
      clientSequence: Date.now(),
    }
    const syncEvent = buildProductSyncEvent('create', { ...productRow, id: productRow.id as string, version: 1 }, syncCtx)
    getRealSyncEngine().enqueue(syncEvent).catch(() => {})

    // Push to cloud (fire-and-forget)
    pushProduct(id).catch(() => {})
    return db.prepare('SELECT * FROM products WHERE id = ? AND shop_id = ?').get(id, shopId)
  })

  ipcMain.handle('db:products:update', async (_event, id: string, rawData: unknown) => {
    const session = await desktopLoadSession()
    if (!session) throw new Error('Not authenticated')
    // Phase 04: capability enforcement
    if (!can(getCallerMember(session), CAPABILITIES.PRODUCTS_UPDATE)) {
      throw new Error('Insufficient permissions: products.update required')
    }
    const data = productUpdateSchema.parse(rawData)
    const db = getDatabase()
    const now = new Date().toISOString()
    const shopId = await resolveActiveShopId()
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
    values.push(now, id, shopId)
    db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ? AND shop_id = ?`).run(...values)

    // Phase 08: enqueue product.updated sync event
    const productRow = db.prepare('SELECT * FROM products WHERE id = ? AND shop_id = ?').get(id, shopId) as Record<string, unknown> | undefined
    if (productRow) {
      const syncCtx: ProductSyncEventContext = {
        businessId: asBusinessId(shopId),
        originatingDeviceId: asDeviceId(session?.deviceId ?? 'desktop'),
        originatingEmployeeId: asEmployeeId(session?.employeeId ?? ''),
        clientSequence: Date.now(),
      }
      const syncEvent = buildProductSyncEvent('update', { ...productRow, id: productRow.id as string, version: Number(productRow.version ?? 1) }, syncCtx)
      getRealSyncEngine().enqueue(syncEvent).catch(() => {})
    }

    pushProduct(id).catch(() => {})
    return db.prepare('SELECT * FROM products WHERE id = ? AND shop_id = ?').get(id, shopId)
  })

  ipcMain.handle('db:products:delete', async (_event, id: string) => {
    const session = await desktopLoadSession()
    if (!session) throw new Error('Not authenticated')
    // Phase 04: capability enforcement — products.archive is the capability for soft-delete
    if (!can(getCallerMember(session), CAPABILITIES.PRODUCTS_ARCHIVE)) {
      throw new Error('Insufficient permissions: products.archive required')
    }
    const now = new Date().toISOString()
    const shopId = await resolveActiveShopId()
    const productRow = getDatabase().prepare('SELECT * FROM products WHERE id = ? AND shop_id = ?').get(id, shopId) as Record<string, unknown> | undefined
    getDatabase().prepare('UPDATE products SET deleted_at = ?, is_active = 0 WHERE id = ? AND shop_id = ?').run(now, id, shopId)

    // Phase 08: enqueue product.archived sync event
    if (productRow) {
      const syncCtx: ProductSyncEventContext = {
        businessId: asBusinessId(shopId),
        originatingDeviceId: asDeviceId(session?.deviceId ?? 'desktop'),
        originatingEmployeeId: asEmployeeId(session?.employeeId ?? ''),
        clientSequence: Date.now(),
      }
      const syncEvent = buildProductSyncEvent('tombstone', { ...productRow, id: productRow.id as string, version: Number(productRow.version ?? 1) }, syncCtx)
      getRealSyncEngine().enqueue(syncEvent).catch(() => {})
    }

    pushProduct(id).catch(() => {})
  })

  log.info('Product mutation handlers registered')
}
