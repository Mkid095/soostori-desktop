import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'

export function registerInventoryTxHandlers(): void {
  ipcMain.handle('db:inventory:txCreate', (_event, rawData: unknown) => {
    const data = rawData as { shopId: string; productId: string; deviceId: string; userId: string; eventType: string; quantity: number; payload?: string }
    const db = getDatabase()
    const id = uuidv4()
    const now = new Date().toISOString()

    const seqRow = db.prepare('SELECT MAX(sequence_number) as maxSeq FROM inventory_transactions WHERE shop_id = ? AND product_id = ?').get(data.shopId, data.productId) as { maxSeq: number | null } | undefined
    const sequenceNumber = (seqRow?.maxSeq ?? -1) + 1

    const balanceRow = db.prepare('SELECT SUM(quantity) as balance FROM inventory_transactions WHERE shop_id = ? AND product_id = ? AND status = ?').get(data.shopId, data.productId, 'confirmed') as { balance: number | null } | undefined
    const balanceAfter = (balanceRow?.balance ?? 0) + data.quantity

    db.prepare(`
      INSERT INTO inventory_transactions (id, shop_id, product_id, device_id, user_id, event_type, quantity, balance_after, status, payload, sequence_number, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?)
    `).run(id, data.shopId, data.productId, data.deviceId, data.userId, data.eventType, data.quantity, balanceAfter, data.payload || null, sequenceNumber, now)

    // Update the stock cache on products — atomic with the transaction
    db.prepare(`UPDATE products SET current_stock = ?, updated_at = ? WHERE id = ?`).run(balanceAfter, now, data.productId)

    log.info(`Inventory tx: ${id}, product: ${data.productId}, qty: ${data.quantity}, balance: ${balanceAfter}`)
    return db.prepare('SELECT * FROM inventory_transactions WHERE id = ?').get(id)
  })

  ipcMain.handle('db:inventory:getBalance', (_event, shopId: string, productId: string) => {
    const db = getDatabase()
    const row = db.prepare('SELECT SUM(quantity) as balance FROM inventory_transactions WHERE shop_id = ? AND product_id = ? AND status = ?').get(shopId, productId, 'confirmed') as { balance: number | null } | undefined
    return { balance: row?.balance ?? 0 }
  })

  ipcMain.handle('db:inventory:getHistory', (_event, shopId: string, productId: string, limit: number = 100) => {
    const db = getDatabase()
    return db.prepare('SELECT * FROM inventory_transactions WHERE shop_id = ? AND product_id = ? ORDER BY created_at DESC LIMIT ?').all(shopId, productId, limit)
  })

  ipcMain.handle('db:inventory:createSnapshot', (_event, shopId: string, productCount: number, lastSequence: number) => {
    const db = getDatabase()
    const id = uuidv4()
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO inventory_snapshots (id, shop_id, product_count, last_sequence, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, shopId, productCount, lastSequence, now)
    return db.prepare('SELECT * FROM inventory_snapshots WHERE id = ?').get(id)
  })

  ipcMain.handle('db:inventory:getLatestSnapshot', (_event, shopId: string) => {
    const db = getDatabase()
    return db.prepare('SELECT * FROM inventory_snapshots WHERE shop_id = ? ORDER BY created_at DESC LIMIT 1').get(shopId)
  })

  log.info('Inventory tx IPC handlers registered')
}
