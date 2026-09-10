import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'
import { customerCreateSchema, customerUpdateSchema } from './validation'
// Phase 04: canonical capability API
import { can, CAPABILITIES } from '@soostori/auth'
import type { Member } from '@soostori/auth'
import type { EmployeeRole } from '@soostori/core'
import { desktopLoadSession } from '../auth/electron-store-session'
import { resolveActiveShopId } from '../database/active-shop'

/** Build a Member for the capability system from an employeeId. */
function getMember(employeeId: string): Member {
  const db = getDatabase()
  const row = db.prepare('SELECT role FROM employees WHERE id = ?').get(employeeId) as { role: string } | undefined
  return { role: (row?.role ?? 'cashier') as EmployeeRole }
}

export function registerCustomerHandlers(): void {
  // Ensure id_number column exists for older DBs
  const db = getDatabase()
  const custInfo = db.prepare(`PRAGMA table_info(customers)`).all() as Array<{ name: string }>
  if (!custInfo.some(c => c.name === 'id_number')) {
    db.exec(`ALTER TABLE customers ADD COLUMN id_number TEXT`)
  }

  ipcMain.handle('db:customers:list', async () => {
    const db = getDatabase()
    const shopId = await resolveActiveShopId()
    return db.prepare('SELECT * FROM customers WHERE is_active = 1 AND shop_id = ? ORDER BY name ASC').all(shopId)
  })

  ipcMain.handle('db:customers:get', async (_event, id: string) => {
    const db = getDatabase()
    const shopId = await resolveActiveShopId()
    return db.prepare('SELECT * FROM customers WHERE id = ? AND shop_id = ?').get(id, shopId)
  })

  ipcMain.handle('db:customers:create', async (_event, rawData: unknown) => {
    const session = await desktopLoadSession()
    if (!session) throw new Error('Not authenticated')
    if (!can(getMember(session.employeeId), CAPABILITIES.CUSTOMERS_CREATE)) throw new Error('Insufficient permissions')
    const data = customerCreateSchema.parse(rawData)
    const db = getDatabase()
    const id = uuidv4()
    const now = new Date().toISOString()
    const shopId = await resolveActiveShopId()
    db.prepare(`
      INSERT INTO customers (id, name, phone, email, address, notes, id_number, shop_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.name, data.phone || null, data.email || null, data.address || null, data.notes || null, data.idNumber || null, shopId, now, now)
    return db.prepare('SELECT * FROM customers WHERE id = ? AND shop_id = ?').get(id, shopId)
  })

  ipcMain.handle('db:customers:update', async (_event, id: string, rawData: unknown) => {
    const session = await desktopLoadSession()
    if (!session) throw new Error('Not authenticated')
    if (!can(getMember(session.employeeId), CAPABILITIES.CUSTOMERS_UPDATE)) throw new Error('Insufficient permissions')
    const data = customerUpdateSchema.parse(rawData)
    const db = getDatabase()
    const now = new Date().toISOString()
    const shopId = await resolveActiveShopId()
    const fields: string[] = []
    const values: (string | null)[] = []
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
    if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone || null) }
    if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email || null) }
    if (data.address !== undefined) { fields.push('address = ?'); values.push(data.address || null) }
    if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes || null) }
    if (data.idNumber !== undefined) { fields.push('id_number = ?'); values.push(data.idNumber || null) }
    fields.push('updated_at = ?'); values.push(now, id, shopId)
    db.prepare(`UPDATE customers SET ${fields.join(', ')} WHERE id = ? AND shop_id = ?`).run(...values)
    return db.prepare('SELECT * FROM customers WHERE id = ? AND shop_id = ?').get(id, shopId)
  })

  ipcMain.handle('db:customers:delete', async (_event, id: string) => {
    const session = await desktopLoadSession()
    if (!session) throw new Error('Not authenticated')
    if (!can(getMember(session.employeeId), CAPABILITIES.CUSTOMERS_DELETE)) throw new Error('Insufficient permissions')
    const db = getDatabase()
    const shopId = await resolveActiveShopId()
    db.prepare('UPDATE customers SET is_active = 0 WHERE id = ? AND shop_id = ?').run(id, shopId)
  })

  log.info('Customer IPC handlers registered')
}
