import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'
import { hashPin } from '../database/pin-hash'

export function registerShopHandlers(): void {
  ipcMain.handle('db:shop:create', (_event, rawData: unknown) => {
    const data = rawData as { shopName: string; ownerName: string; ownerPin: string; currency?: string }
    const db = getDatabase()
    const shopId = uuidv4()
    const userId = uuidv4()
    const now = new Date().toISOString()
    const { hash, salt } = hashPin(data.ownerPin)

    db.prepare(`INSERT INTO shops (id, name, currency, created_at) VALUES (?, ?, ?, ?)`)
      .run(shopId, data.shopName, data.currency || 'KES', now)

    db.prepare(`
      INSERT INTO employees (id, shop_id, name, pin_hash, pin_salt, role, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, 'owner', 1, ?)
    `).run(userId, shopId, data.ownerName, hash, salt, now)

    log.info(`Shop created: ${shopId}, owner: ${userId}`)
    return {
      shop: db.prepare('SELECT * FROM shops WHERE id = ?').get(shopId),
      user: db.prepare('SELECT id, shop_id, name, role, is_active, created_at FROM employees WHERE id = ?').get(userId),
    }
  })

  ipcMain.handle('db:shop:get', () => {
    const db = getDatabase()
    return db.prepare('SELECT * FROM shops LIMIT 1').get()
  })

  ipcMain.handle('db:shop:getUsers', () => {
    const db = getDatabase()
    return db.prepare('SELECT id, shop_id, name, role, is_active, created_at FROM employees WHERE is_active = 1').all()
  })

  log.info('Shop IPC handlers registered')
}
