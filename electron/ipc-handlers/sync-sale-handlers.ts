import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'

export function registerSyncSaleHandlers(): void {
  ipcMain.handle('db:syncSales:create', (_event, rawData: unknown) => {
    const data = rawData as { shopId: string; saleId: string; employeeId: string; deviceId: string; total: number; paymentMethod: string; note?: string }
    const db = getDatabase()
    const id = uuidv4()
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO sync_sales (id, shop_id, sale_id, employee_id, device_id, status, payment_method, total, payload, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
    `).run(id, data.shopId, data.saleId, data.employeeId, data.deviceId, data.total, data.paymentMethod, data.note || null, now)
    log.info(`SyncSale: created ${id}, total=${data.total}, status=pending`)
    return db.prepare('SELECT * FROM sync_sales WHERE id = ?').get(id)
  })

  ipcMain.handle('db:syncSales:updateStatus', (_event, id: string, status: 'confirmed' | 'rejected') => {
    const db = getDatabase()
    db.prepare(`UPDATE sync_sales SET status = ? WHERE id = ?`).run(status, id)
    log.info(`SyncSale: ${id} -> ${status}`)
  })

  ipcMain.handle('db:syncSales:get', (_event, id: string) => {
    const db = getDatabase()
    return db.prepare('SELECT * FROM sync_sales WHERE id = ?').get(id)
  })

  ipcMain.handle('db:syncSales:list', (_event, shopId?: string, limit = 100) => {
    const db = getDatabase()
    if (shopId) {
      return db.prepare('SELECT * FROM sync_sales WHERE shop_id = ? ORDER BY created_at DESC LIMIT ?').all(shopId, limit)
    }
    return db.prepare('SELECT * FROM sync_sales ORDER BY created_at DESC LIMIT ?').all(limit)
  })

  log.info('SyncSale IPC handlers registered')
}
