import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'
import { customerCreateSchema, customerUpdateSchema } from './validation'

export function registerCustomerHandlers(): void {
  // Ensure id_number column exists for older DBs
  const db = getDatabase()
  const custInfo = db.prepare(`PRAGMA table_info(customers)`).all() as Array<{ name: string }>
  if (!custInfo.some(c => c.name === 'id_number')) {
    db.exec(`ALTER TABLE customers ADD COLUMN id_number TEXT`)
  }

  ipcMain.handle('db:customers:list', () => {
    const db = getDatabase()
    return db.prepare('SELECT * FROM customers WHERE is_active = 1 ORDER BY name ASC').all()
  })

  ipcMain.handle('db:customers:get', (_event, id: string) => {
    const db = getDatabase()
    return db.prepare('SELECT * FROM customers WHERE id = ?').get(id)
  })

  ipcMain.handle('db:customers:create', (_event, rawData: unknown) => {
    const data = customerCreateSchema.parse(rawData)
    const db = getDatabase()
    const id = uuidv4()
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO customers (id, name, phone, email, address, notes, id_number, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.name, data.phone || null, data.email || null, data.address || null, data.notes || null, data.idNumber || null, now, now)
    return db.prepare('SELECT * FROM customers WHERE id = ?').get(id)
  })

  ipcMain.handle('db:customers:update', (_event, id: string, rawData: unknown) => {
    const data = customerUpdateSchema.parse(rawData)
    const db = getDatabase()
    const now = new Date().toISOString()
    const fields: string[] = []
    const values: (string | null)[] = []
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
    if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone || null) }
    if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email || null) }
    if (data.address !== undefined) { fields.push('address = ?'); values.push(data.address || null) }
    if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes || null) }
    if (data.idNumber !== undefined) { fields.push('id_number = ?'); values.push(data.idNumber || null) }
    fields.push('updated_at = ?'); values.push(now); values.push(id)
    db.prepare(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return db.prepare('SELECT * FROM customers WHERE id = ?').get(id)
  })

  ipcMain.handle('db:customers:delete', (_event, id: string) => {
    const db = getDatabase()
    db.prepare('UPDATE customers SET is_active = 0 WHERE id = ?').run(id)
  })

  log.info('Customer IPC handlers registered')
}
