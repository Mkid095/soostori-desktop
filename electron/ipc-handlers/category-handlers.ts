import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'
import { categoryCreateSchema, categoryUpdateSchema } from './validation'

export function registerCategoryHandlers(): void {
  ipcMain.handle('db:categories:list', (_event, _shopId?: string) => {
    const db = getDatabase()
    return db.prepare(`
      SELECT * FROM categories WHERE is_active = 1 ORDER BY display_order ASC, name ASC
    `).all()
  })

  ipcMain.handle('db:categories:create', (_event, rawData: unknown) => {
    const data = categoryCreateSchema.parse(rawData)
    const db = getDatabase()
    const id = uuidv4()
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO categories (id, name, description, icon, color, display_order, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      id,
      data.name,
      data.description || null,
      data.icon || null,
      data.color || '#6366f1',
      data.displayOrder ?? 0,
      now,
      now
    )

    return db.prepare('SELECT * FROM categories WHERE id = ?').get(id)
  })

  ipcMain.handle('db:categories:update', (_event, id: string, rawData: unknown) => {
    const data = categoryUpdateSchema.parse(rawData)
    const db = getDatabase()
    const now = new Date().toISOString()

    const fields: string[] = []
    const values: (string | number | null)[] = []

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description || null) }
    if (data.icon !== undefined) { fields.push('icon = ?'); values.push(data.icon || null) }
    if (data.color !== undefined) { fields.push('color = ?'); values.push(data.color || null) }
    if (data.displayOrder !== undefined) { fields.push('display_order = ?'); values.push(data.displayOrder ?? 0) }
    if (data.isActive !== undefined) { fields.push('is_active = ?'); values.push(data.isActive ? 1 : 0) }

    fields.push('updated_at = ?')
    values.push(now)
    values.push(id)

    db.prepare(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return db.prepare('SELECT * FROM categories WHERE id = ?').get(id)
  })

  ipcMain.handle('db:categories:delete', (_event, id: string) => {
    const db = getDatabase()
    db.prepare('UPDATE categories SET is_active = 0 WHERE id = ?').run(id)
  })

  log.info('Category IPC handlers registered')
}
