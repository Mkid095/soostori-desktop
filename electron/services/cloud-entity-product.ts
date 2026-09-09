/**
 * cloud-entity-product.ts — Product push/pull to cloud InstantDB.
 * Part of cloud-entity-sync split per ANPAS (≤150 lines per file).
 */

import { getDatabase } from '../database'
import * as instant from './instant-api'
import log from 'electron-log'

const APP_ID = process.env.INSTANT_APP_ID || ''

export async function pushProduct(productId: string): Promise<void> {
  if (!APP_ID) return
  const db = getDatabase()
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId) as Record<string, unknown> | undefined
  if (!product) return

  try {
    await instant.instamlTx(APP_ID, [[
      'update', 'products', `products_${productId}`, {
        id: productId,
        shopId: product.shop_id as string,
        name: product.name as string,
        barcode: product.barcode as string | null,
        sku: product.sku as string | null,
        categoryId: product.category_id as string | null,
        categoryName: product.category_name as string | null,
        costPrice: Number(product.cost_price) || 0,
        sellingPrice: Number(product.selling_price) || 0,
        groupPrices: product.group_prices as string | null,
        isGroup: product.is_group as number ?? 0,
        unitsPerPackage: product.units_per_package as number ?? 1,
        stockQuantity: Number(product.stock_quantity) || 0,
        currentStock: Number(product.current_stock) || 0,
        lowStockThreshold: Number(product.low_stock_threshold) || 0,
        trackInventory: product.track_inventory as number ?? 1,
        allowSingleUnitSale: product.allow_single_unit_sale as number ?? 1,
        distributorName: product.distributor_name as string | null,
        distributorPhone: product.distributor_phone as string | null,
        image: product.image as string | null,
        isActive: product.is_active as number ?? 1,
        createdAt: product.created_at as string,
        updatedAt: new Date().toISOString(),
      }
    ]])
    log.debug(`pushProduct: ${productId}`)
  } catch (err) {
    log.warn('pushProduct failed:', err)
  }
}

export async function pushAllProducts(): Promise<number> {
  if (!APP_ID) return 0
  const db = getDatabase()
  try {
    const rows = db.prepare('SELECT id FROM products').all() as Array<{ id: string }>
    for (const row of rows) await pushProduct(row.id)
    return rows.length
  } catch (err) {
    log.warn('pushAllProducts failed:', err)
    return 0
  }
}

export async function pullProducts(shopId: string): Promise<number> {
  if (!APP_ID) return 0
  const db = getDatabase()
  try {
    const result = await instant.instaqQuery(APP_ID, { products: { $: { where: { shopId } } } })
    const rows = (result as { products?: unknown[] }).products ?? []
    let count = 0
    for (const row of rows) {
      const p = row as Record<string, unknown>
      const localId = String(p.id ?? '').replace(/^products_/, '')
      if (!localId) continue
      db.prepare(`
        INSERT OR REPLACE INTO products (
          id, category_id, name, sku, barcode, description, image_url,
          cost_price, selling_price, discount_price, unit,
          stock_quantity, current_stock, low_stock_threshold,
          track_inventory, has_variants, parent_variant_id, expiry_date, metadata,
          is_active, deleted_at, distributor_name, distributor_phone,
          allow_single_unit_sale, units_per_package, box_buying_price,
          bulk_selling_price, group_prices, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?, datetime('now'), datetime('now')
        )
      `).run(
        localId, (p.categoryId as string) || null, (p.name as string) || '',
        (p.sku as string) || null, (p.barcode as string) || null, null,
        (p.image as string) || null, (p.costPrice as number) || 0,
        (p.sellingPrice as number) || 0, (p.discountPrice as number) || null, (p.unit as string) || 'piece',
        (p.stockQuantity as number) || 0, (p.currentStock as number) || 0, (p.lowStockThreshold as number) || 5,
        (p.trackInventory as number) ?? 1, (p.hasVariants as number) ?? 0, null, null, null,
        (p.isActive as number) ?? 1, null, (p.distributorName as string) || null, (p.distributorPhone as string) || null,
        (p.allowSingleUnitSale as number) ?? 1, (p.unitsPerPackage as number) || null,
        null, null, (p.groupPrices as string) || null,
      )
      count++
    }
    log.debug(`pullProducts: pulled ${count} products`)
    return count
  } catch (err) {
    log.warn('pullProducts failed:', err)
    return 0
  }
}
