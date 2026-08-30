import { ipcMain } from 'electron'
import { getDatabase } from '../database'

export function registerSaleQueryHandlers(): void {
  ipcMain.handle('db:sales:list', (_event, _shopId?: string, limit?: number) => {
    const db = getDatabase()
    return db.prepare(`
      SELECT s.*, GROUP_CONCAT(si.product_name || ' x' || si.quantity) as items_summary
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id
      GROUP BY s.id
      ORDER BY s.created_at DESC
      LIMIT ?
    `).all(limit ?? 999999)
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

  ipcMain.handle('db:sales:listByDateRange', (_event, startDate: string, endDate: string, _shopId?: string) => {
    const db = getDatabase()
    return db.prepare(`
      SELECT * FROM sales WHERE created_at >= ? AND created_at <= ?
      ORDER BY created_at DESC
    `).all(startDate, endDate)
  })

  ipcMain.handle('db:sales:topProducts', (_event, startDate: string, endDate: string, limit = 10) => {
    const db = getDatabase()
    return db.prepare(`
      SELECT si.product_name, SUM(si.quantity) as totalQty, SUM(si.total_price) as totalRevenue
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE s.created_at >= ? AND s.created_at <= ?
      GROUP BY si.product_name
      ORDER BY totalQty DESC
      LIMIT ?
    `).all(startDate, endDate, limit)
  })
}
