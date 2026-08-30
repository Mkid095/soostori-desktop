import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'
import { hashPin, verifyPin } from '../database/pin-hash'

interface ShopUserRow {
  id: string; shop_id: string; name: string; pin_hash: string;
  pin_salt: string; role: string; is_active: number; created_at: string;
}

export function registerAuthHandlers(): void {
  ipcMain.handle('db:auth:login', (_event, rawData: unknown) => {
    const data = rawData as { shopId: string; userId: string; pin: string; deviceId: string }
    const db = getDatabase()
    const user = db.prepare('SELECT * FROM employees WHERE id = ? AND is_active = 1').get(data.userId) as ShopUserRow | undefined
    if (!user) throw new Error('User not found or inactive')
    if (!verifyPin(data.pin, user.pin_hash, user.pin_salt)) throw new Error('Invalid PIN')
    const sessionId = uuidv4()
    const now = new Date().toISOString()
    db.prepare(`INSERT INTO device_sessions (id, device_id, user_id, login_at) VALUES (?, ?, ?, ?)`).run(sessionId, data.deviceId, data.userId, now)
    db.prepare('UPDATE devices SET is_online = 1, last_seen = ? WHERE id = ?').run(now, data.deviceId)
    return { sessionId, user: { id: user.id, shop_id: user.shop_id, name: user.name, role: user.role } }
  })

  ipcMain.handle('db:auth:createUser', (_event, rawData: unknown) => {
    const data = rawData as { shopId: string; name: string; pin: string; role: string; createdBy: string }
    const db = getDatabase()
    const userId = uuidv4()
    const { hash, salt } = hashPin(data.pin)
    db.prepare(`INSERT INTO employees (id, shop_id, name, pin_hash, pin_salt, role, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)`)
      .run(userId, data.shopId, data.name, hash, salt, data.role, new Date().toISOString())
    return db.prepare('SELECT id, shop_id, name, role, is_active, created_at FROM employees WHERE id = ?').get(userId)
  })

  ipcMain.handle('db:auth:updateUser', (_event, rawData: unknown) => {
    const data = rawData as { userId: string; name?: string; pin?: string; role?: string }
    const db = getDatabase()
    const fields: string[] = []; const values: (string | number | null)[] = []
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
    if (data.role !== undefined) { fields.push('role = ?'); values.push(data.role) }
    if (data.pin) { const { hash, salt } = hashPin(data.pin); fields.push('pin_hash = ?', 'pin_salt = ?'); values.push(hash, salt) }
    if (fields.length === 0) return db.prepare('SELECT * FROM employees WHERE id = ?').get(data.userId)
    values.push(data.userId)
    db.prepare(`UPDATE employees SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return db.prepare('SELECT id, shop_id, name, role, is_active, created_at FROM employees WHERE id = ?').get(data.userId)
  })

  ipcMain.handle('db:auth:deleteUser', (_event, userId: string) => {
    getDatabase().prepare('UPDATE employees SET is_active = 0 WHERE id = ?').run(userId)
    return { success: true }
  })

  ipcMain.handle('db:auth:logout', (_event, deviceId: string, userId: string) => {
    const db = getDatabase(); const now = new Date().toISOString()
    db.prepare('UPDATE device_sessions SET logout_at = ? WHERE device_id = ? AND user_id = ? AND logout_at IS NULL').run(now, deviceId, userId)
    db.prepare('UPDATE devices SET is_online = 0 WHERE id = ?').run(deviceId)
    return { success: true }
  })

  log.info('Auth IPC handlers registered')
}
