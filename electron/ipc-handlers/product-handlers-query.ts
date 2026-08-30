import { ipcMain } from 'electron'
import { getDatabase } from '../database'

const PRODUCT_SELECT = `
  SELECT p.*, c.name as category_name, c.color as category_color, c.icon as category_icon
  FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.deleted_at IS NULL AND p.is_active = 1
`

export function registerProductQueryHandlers(): void {
  ipcMain.handle('db:products:list', (_event, _shopId?: string) => {
    return getDatabase().prepare(`${PRODUCT_SELECT} ORDER BY p.name ASC`).all()
  })

  ipcMain.handle('db:products:get', (_event, id: string) => {
    const db = getDatabase()
    return db.prepare(`${PRODUCT_SELECT} AND p.id = ?`).get(id)
  })

  ipcMain.handle('db:products:getByBarcode', (_event, barcode: string) => {
    const normalized = barcode.trim().toUpperCase()
    return getDatabase().prepare(`${PRODUCT_SELECT} AND UPPER(TRIM(p.barcode)) = ?`).get(normalized)
  })

  ipcMain.handle('db:products:search', (_event, query: string, _shopId?: string) => {
    const db = getDatabase()
    const pattern = `%${query}%`
    return db.prepare(`${PRODUCT_SELECT} AND (p.name LIKE ? OR p.barcode LIKE ? OR p.sku LIKE ?) ORDER BY p.name ASC LIMIT 50`)
      .all(pattern, pattern, pattern)
  })

  ipcMain.handle('db:products:lookupBarcode', (_event, barcode: string) => {
    const normalized = barcode.trim().toUpperCase()
    const product = getDatabase().prepare(`${PRODUCT_SELECT.replace('p.deleted_at IS NULL AND ', '')} AND UPPER(TRIM(p.barcode)) = ?`).get(normalized)
    return product || null
  })

  ipcMain.handle('db:products:validateImport', (_event, rows: unknown[]) => {
    const db = getDatabase()
    const csvRows = rows as Array<{ name: string; barcode?: string; sku?: string }>
    const newProducts: typeof csvRows = []
    const updates: typeof csvRows = []
    const duplicates: typeof csvRows = []

    for (const row of csvRows) {
      if (!row.name?.trim()) continue

      // Check by barcode first
      if (row.barcode?.trim()) {
        const normalized = row.barcode.trim().toUpperCase()
        const existing = db.prepare(`${PRODUCT_SELECT} AND UPPER(TRIM(p.barcode)) = ?`).get(normalized)
        if (existing) {
          updates.push(row)
          continue
        }
      }

      // Check by name (no barcode match) — duplicate name
      const nameMatch = db.prepare(`${PRODUCT_SELECT} AND LOWER(p.name) = LOWER(?)`).get(row.name.trim())
      if (nameMatch) {
        duplicates.push(row)
        continue
      }

      newProducts.push(row)
    }

    return { new: newProducts, updates, duplicates }
  })
}
