/**
 * cloud-snapshot.ts — Initial snapshot download service.
 *
 * When a new device joins a shop, it downloads all operational entities
 * from the cloud into local SQLite. This makes the device operational
 * immediately without manual setup.
 *
 * Flow:
 *   1. cloudDownloadInitialSnapshot(shopId) is called by cloud:auth:registerDevice
 *   2. Queries cloud for products, categories, customers, employees
 *   3. Upserts all into local SQLite
 *   4. Returns count of records downloaded
 *
 * Idempotent: running twice with same data produces same state.
 */

import { getDatabase } from '../database'
import * as instant from './instant-api'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'

const APP_ID = process.env.INSTANT_APP_ID || ''

export interface SnapshotResult {
  products: number
  categories: number
  customers: number
  total: number
}

export async function cloudDownloadInitialSnapshot(shopId: string): Promise<SnapshotResult> {
  if (!APP_ID) return { products: 0, categories: 0, customers: 0, total: 0 }
  const db = getDatabase()
  const now = new Date().toISOString()
  let products = 0, categories = 0, customers = 0

  try {
    // 1. Categories
    const catResult = await instant.instaqQuery(APP_ID, {
      categories: { $: { where: { shopId } } }
    })
    const catRows = (catResult as { categories?: Array<Record<string, unknown>> })?.categories ?? []
    for (const c of catRows) {
      const id = String(c.id ?? '')
      if (!id) continue
      const existing = db.prepare('SELECT id FROM categories WHERE id = ?').get(id)
      if (existing) continue
      db.prepare(`INSERT OR IGNORE INTO categories
        (id, name, description, color, display_order, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, String(c.name ?? 'Uncategorized'), c.description as string | null,
          (c.color as string) ?? '#6366f1', Number(c.displayOrder) || 0,
          (c.isActive as number) ?? 1, (c.createdAt as string) ?? now, now)
      categories++
    }

    // 2. Products
    const prodResult = await instant.instaqQuery(APP_ID, {
      products: { $: { where: { shopId } } }
    })
    const prodRows = (prodResult as { products?: Array<Record<string, unknown>> })?.products ?? []
    for (const p of prodRows) {
      const id = String(p.id ?? '')
      if (!id) continue
      const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(id)
      if (existing) continue
      db.prepare(`INSERT OR IGNORE INTO products
        (id, name, sku, barcode, category_id, description, image_url, cost_price, selling_price,
         stock_quantity, current_stock, low_stock_threshold, track_inventory, allow_single_unit_sale,
         units_per_package, group_prices, distributor_name, distributor_phone, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id,
          String(p.name ?? 'Unknown'),
          p.sku as string | null, p.barcode as string | null,
          (p.categoryId as string) ?? null,
          p.description as string | null,
          p.image as string | null,
          Number(p.costPrice) || 0,
          Number(p.sellingPrice) || 0,
          Number(p.stockQuantity) || 0,
          Number(p.currentStock) || 0,
          Number(p.lowStockThreshold) || 5,
          (p.trackInventory as number) ?? 1,
          (p.allowSingleUnitSale as number) ?? 1,
          (p.unitsPerPackage as number) ?? 1,
          (p.groupPrices as string) ?? null,
          p.distributorName as string | null,
          p.distributorPhone as string | null,
          (p.isActive as number) ?? 1,
          (p.createdAt as string) ?? now, now)
      products++
    }

    // 3. Customers
    const custResult = await instant.instaqQuery(APP_ID, {
      customers: { $: { where: { shopId } } }
    })
    const custRows = (custResult as { customers?: Array<Record<string, unknown>> })?.customers ?? []
    for (const c of custRows) {
      const id = String(c.id ?? '')
      if (!id) continue
      const existing = db.prepare('SELECT id FROM customers WHERE id = ?').get(id)
      if (existing) continue
      db.prepare(`INSERT OR IGNORE INTO customers
        (id, name, phone, email, id_number, address, notes, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, String(c.name ?? 'Unknown'),
          c.phone as string | null, c.email as string | null,
          (c.idNumber as string) ?? null, c.address as string | null, c.notes as string | null,
          (c.isActive as number) ?? 1, (c.createdAt as string) ?? now, now)
      customers++
    }

    const total = products + categories + customers
    log.info(`Snapshot downloaded: ${products} products, ${categories} categories, ${customers} customers`)
    return { products, categories, customers, total }
  } catch (err) {
    log.warn('cloudDownloadInitialSnapshot failed', err)
    return { products, categories, customers, total: products + categories + customers }
  }
}
