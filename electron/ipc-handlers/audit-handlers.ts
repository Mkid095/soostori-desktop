import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'

export function registerAuditHandlers(): void {
  ipcMain.handle('db:audit:log', (_event, rawData: unknown) => {
    const data = rawData as { shopId: string; userId: string; deviceId?: string; action: string; entityType?: string; entityId?: string; payload?: string }
    const db = getDatabase()
    const id = uuidv4()
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO audit_logs (id, shop_id, user_id, device_id, action, entity_type, entity_id, payload, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.shopId, data.userId, data.deviceId || null, data.action, data.entityType || null, data.entityId || null, data.payload || null, now)
    log.info(`Audit: ${data.action} by ${data.userId}`)
    return { id }
  })

  ipcMain.handle('db:audit:list', (_event, shopId: string, limit: number = 100) => {
    const db = getDatabase()
    return db.prepare('SELECT * FROM audit_logs WHERE shop_id = ? ORDER BY created_at DESC LIMIT ?').all(shopId, limit)
  })

  log.info('Audit IPC handlers registered')
}
