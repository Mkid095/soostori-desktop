import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'
import { productCreateSchema } from './validation'
import { resolveShopIdSync } from '../database/active-shop'

interface CsvProductRow {
  name: string
  barcode?: string
  sku?: string
  category?: string
  costPrice?: number
  sellingPrice: number
  stockQuantity?: number
  lowStockThreshold?: number
}

export function registerProductMutationHandlers(): void {
  ipcMain.handle('db:products:bulkCreate', (_event, products: unknown[]) => {
    const rows = products as CsvProductRow[]
    const db = getDatabase()
    const now = new Date().toISOString()
    const shopId = resolveShopIdSync()
    let createdCount = 0

    const insert = db.prepare(`
      INSERT INTO products (id, category_id, name, sku, barcode, cost_price, selling_price, unit, stock_quantity, low_stock_threshold, is_active, shop_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
    `)

    const findCategory = db.prepare(`SELECT id FROM categories WHERE LOWER(name) = LOWER(?) AND is_active = 1 AND shop_id = ?`)

    const insertMany = db.transaction(() => {
      for (const row of rows) {
        const id = uuidv4()
        let categoryId: string | null = null
        if (row.category) {
          const cat = findCategory.get(row.category, shopId) as { id: string } | undefined
          categoryId = cat?.id ?? null
        }
        insert.run(
          id,
          categoryId,
          row.name,
          row.sku || null,
          row.barcode || null,
          row.costPrice ?? 0,
          row.sellingPrice,
          'piece',
          row.stockQuantity ?? 0,
          row.lowStockThreshold ?? 5,
          shopId,
          now,
          now,
        )
        createdCount++
      }
    })

    insertMany()
    log.info(`Bulk created ${createdCount} products via CSV import (shop_id=${shopId})`)
    return { createdCount }
  })

  log.info('Product mutation handlers registered')
}
