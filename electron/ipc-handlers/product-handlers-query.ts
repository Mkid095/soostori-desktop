import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { resolveActiveShopId } from '../database/active-shop'

const PRODUCT_SELECT = `
  SELECT p.*, c.name as category_name, c.color as category_color, c.icon as category_icon
  FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.deleted_at IS NULL AND p.is_active = 1
`

export function registerProductQueryHandlers(): void {
  ipcMain.handle('db:products:list', async (_event, _shopId?: string) => {
    const shopId = await resolveActiveShopId()
    return getDatabase().prepare(`${PRODUCT_SELECT} AND p.shop_id = ? ORDER BY p.name ASC`).all(shopId)
  })

  ipcMain.handle('db:products:get', async (_event, id: string) => {
    const shopId = await resolveActiveShopId()
    const db = getDatabase()
    return db.prepare(`${PRODUCT_SELECT} AND p.id = ? AND p.shop_id = ?`).get(id, shopId)
  })

  ipcMain.handle('db:products:getByBarcode', async (_event, barcode: string) => {
    const normalized = barcode.trim().toUpperCase()
    const shopId = await resolveActiveShopId()
    return getDatabase().prepare(`${PRODUCT_SELECT} AND UPPER(TRIM(p.barcode)) = ? AND p.shop_id = ?`).get(normalized, shopId)
  })

  ipcMain.handle('db:products:search', async (_event, query: string, _shopId?: string) => {
    const db = getDatabase()
    const shopId = await resolveActiveShopId()
    const pattern = `%${query}%`
    return db.prepare(`${PRODUCT_SELECT} AND (p.name LIKE ? OR p.barcode LIKE ? OR p.sku LIKE ?) AND p.shop_id = ? ORDER BY p.name ASC LIMIT 50`)
      .all(pattern, pattern, pattern, shopId)
  })

  ipcMain.handle('db:products:lookupBarcode', async (_event, barcode: string) => {
    const normalized = barcode.trim().toUpperCase()
    const shopId = await resolveActiveShopId()
    const product = getDatabase().prepare(`${PRODUCT_SELECT.replace('p.deleted_at IS NULL AND ', '')} AND UPPER(TRIM(p.barcode)) = ? AND p.shop_id = ?`).get(normalized, shopId)
    return product || null
  })

  ipcMain.handle('db:products:validateImport', async (_event, rows: unknown[]) => {
    const db = getDatabase()
    const shopId = await resolveActiveShopId()
    const csvRows = rows as Array<{ name: string; barcode?: string; sku?: string }>
    const newProducts: typeof csvRows = []
    const updates: typeof csvRows = []
    const duplicates: typeof csvRows = []

    for (const row of csvRows) {
      if (!row.name?.trim()) continue

      // Check by barcode first (scoped to current shop)
      if (row.barcode?.trim()) {
        const normalized = row.barcode.trim().toUpperCase()
        const existing = db.prepare(`${PRODUCT_SELECT} AND UPPER(TRIM(p.barcode)) = ? AND p.shop_id = ?`).get(normalized, shopId)
        if (existing) {
          updates.push(row)
          continue
        }
      }

      // Check by name (no barcode match) — duplicate name within current shop
      const nameMatch = db.prepare(`${PRODUCT_SELECT} AND LOWER(p.name) = LOWER(?) AND p.shop_id = ?`).get(row.name.trim(), shopId)
      if (nameMatch) {
        duplicates.push(row)
        continue
      }

      newProducts.push(row)
    }

    return { new: newProducts, updates, duplicates }
  })
}
