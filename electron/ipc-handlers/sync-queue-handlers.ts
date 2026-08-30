import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'

export function registerSyncQueueHandlers(): void {
  ipcMain.handle('db:syncQueue:add', (_event, rawData: unknown) => {
    const data = rawData as { deviceId: string; eventType: string; payload: string }
    const db = getDatabase()
    const id = uuidv4()
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO sync_queue (id, device_id, event_type, payload, status, retry_count, created_at)
      VALUES (?, ?, ?, ?, 'pending', 0, ?)
    `).run(id, data.deviceId, data.eventType, data.payload, now)
    log.info(`SyncQueue: added ${id}, event=${data.eventType}`)
    return db.prepare('SELECT * FROM sync_queue WHERE id = ?').get(id)
  })

  ipcMain.handle('db:syncQueue:process', (_event, id: string, status: 'sent' | 'failed') => {
    const db = getDatabase()
    if (status === 'failed') {
      db.prepare(`UPDATE sync_queue SET status = 'failed', retry_count = retry_count + 1 WHERE id = ?`).run(id)
    } else {
      db.prepare(`UPDATE sync_queue SET status = 'sent' WHERE id = ?`).run(id)
    }
  })

  ipcMain.handle('db:syncQueue:getPending', (_event, deviceId: string) => {
    const db = getDatabase()
    return db.prepare(`SELECT * FROM sync_queue WHERE device_id = ? AND status = 'pending' ORDER BY created_at ASC`).all(deviceId)
  })

  log.info('SyncQueue IPC handlers registered')
}
