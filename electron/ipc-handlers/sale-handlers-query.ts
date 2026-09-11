import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { resolveActiveShopId } from '../database/active-shop'

export function registerSaleQueryHandlers(): void {
  ipcMain.handle('db:sales:recent', async (_event, limit = 10) => {
    const db = getDatabase()
    const shopId = await resolveActiveShopId()
    const sales = db.prepare(`
      SELECT s.*, GROUP_CONCAT(si.product_name || ' x' || si.quantity) as items_summary
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id AND si.shop_id = s.shop_id
      WHERE s.shop_id = ?
      GROUP BY s.id
      ORDER BY s.created_at DESC
      LIMIT ?
    `).all(shopId, Math.min(limit, 50)) as Array<{ id: string }>

    // Attach items to each sale
    return sales.map(sale => ({
      ...sale,
      items: db.prepare('SELECT * FROM sale_items WHERE sale_id = ? AND shop_id = ?').all(sale.id, shopId),
    }))
  })

  ipcMain.handle('db:sales:list', async (_event, _shopId?: string, limit?: number) => {
    const db = getDatabase()
    const shopId = await resolveActiveShopId()
    return db.prepare(`
      SELECT s.*, GROUP_CONCAT(si.product_name || ' x' || si.quantity) as items_summary
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id AND si.shop_id = s.shop_id
      WHERE s.shop_id = ?
      GROUP BY s.id
      ORDER BY s.created_at DESC
      LIMIT ?
    `).all(shopId, limit ?? 999999)
  })

  ipcMain.handle('db:sales:get', async (_event, id: string) => {
    const db = getDatabase()
    const shopId = await resolveActiveShopId()
    const sale = db.prepare('SELECT * FROM sales WHERE id = ? AND shop_id = ?').get(id, shopId)
    if (sale) {
      const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ? AND shop_id = ?').all(id, shopId)
      return { ...sale, items }
    }
    return null
  })

  ipcMain.handle('db:sales:listByDateRange', async (_event, startDate: string, endDate: string, _shopId?: string) => {
    const db = getDatabase()
    const shopId = await resolveActiveShopId()
    return db.prepare(`
      SELECT * FROM sales WHERE created_at >= ? AND created_at <= ? AND shop_id = ?
      ORDER BY created_at DESC
    `).all(startDate, endDate, shopId)
  })

  ipcMain.handle('db:sales:topProducts', async (_event, startDate: string, endDate: string, limit = 10) => {
    const db = getDatabase()
    const shopId = await resolveActiveShopId()
    return db.prepare(`
      SELECT si.product_name, SUM(si.quantity) as totalQty, SUM(si.total_price) as totalRevenue
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id AND si.shop_id = s.shop_id
      WHERE s.created_at >= ? AND s.created_at <= ? AND s.shop_id = ?
      GROUP BY si.product_name
      ORDER BY totalQty DESC
      LIMIT ?
    `).all(startDate, endDate, shopId, limit)
  })
}
