import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'

export function registerSyncConflictHandlers(): void {
  ipcMain.handle('db:syncConflicts:list', (_event, shopId: string, status?: string) => {
    const db = getDatabase()
    if (status) {
      return db.prepare('SELECT * FROM sync_conflicts WHERE shop_id = ? AND status = ? ORDER BY created_at DESC').all(shopId, status)
    }
    return db.prepare('SELECT * FROM sync_conflicts WHERE shop_id = ? ORDER BY created_at DESC').all(shopId)
  })

  ipcMain.handle('db:syncConflicts:resolve', (_event, conflictId: string, resolvedBy: string, resolution: 'cancelled' | 'adjusted') => {
    const db = getDatabase()
    const now = new Date().toISOString()
    db.prepare(`UPDATE sync_conflicts SET status = 'resolved', resolved_by = ?, resolved_at = ?, resolution = ? WHERE id = ?`)
      .run(resolvedBy, now, resolution, conflictId)
    log.info(`SyncConflict resolved: ${conflictId} by ${resolvedBy}, resolution: ${resolution}`)
    return db.prepare('SELECT * FROM sync_conflicts WHERE id = ?').get(conflictId)
  })

  ipcMain.handle('db:syncConflicts:count', (_event, shopId: string) => {
    const db = getDatabase()
    const row = db.prepare('SELECT COUNT(*) as count FROM sync_conflicts WHERE shop_id = ? AND status = ?').get(shopId, 'pending') as { count: number }
    return { count: row?.count ?? 0 }
  })

  ipcMain.handle('db:syncConflicts:create', (_event, rawData: unknown) => {
    const data = rawData as { shopId: string; saleId?: string; deviceId: string; employeeId: string; reason: string; payload: string }
    const db = getDatabase()
    const id = uuidv4()
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO sync_conflicts (id, shop_id, sale_id, device_id, employee_id, reason, payload, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(id, data.shopId, data.saleId || null, data.deviceId, data.employeeId, data.reason, data.payload, now)
    log.info(`SyncConflict created: ${id}, reason: ${data.reason}`)
    return db.prepare('SELECT * FROM sync_conflicts WHERE id = ?').get(id)
  })

  log.info('SyncConflict IPC handlers registered')
}
