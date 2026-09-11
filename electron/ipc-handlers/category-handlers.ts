import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'
import { categoryCreateSchema, categoryUpdateSchema } from './validation'
import { pushCategory } from '../services/cloud-entity-sync'
import { resolveActiveShopId } from '../database/active-shop'
import { type CategoriesRow } from '../database/contracts-mapper'
import { getRealSyncEngine } from '../sync/sync-engine'
import { buildCategorySyncEvent, type CategorySyncEventContext } from '../database/sync-event-builder'
import { asBusinessId, asDeviceId, asEmployeeId } from '@soostori/core'
import { desktopLoadSession } from '../auth/electron-store-session'

export function registerCategoryHandlers(): void {
  ipcMain.handle('db:categories:list', async (_event, _shopId?: string) => {
    const db = getDatabase()
    const shopId = await resolveActiveShopId()
    const rows = db.prepare(`
      SELECT * FROM categories WHERE is_active = 1 AND shop_id = ? ORDER BY display_order ASC, name ASC
    `).all(shopId) as CategoriesRow[]
    // Project to contract Category for any consumer that wants canonical types
    // (cycle 04 sub-C: snake_case rows pass through to renderer; contract-shaped
    //  projection is available via fromLocalCategory).
    log.debug(`categories:list mapped ${rows.length} → contract Categories`)
    return rows
  })

  ipcMain.handle('db:categories:create', async (_event, rawData: unknown) => {
    const session = await desktopLoadSession()
    const data = categoryCreateSchema.parse(rawData)
    const db = getDatabase()
    const id = uuidv4()
    const now = new Date().toISOString()
    const shopId = await resolveActiveShopId()

    db.prepare(`
      INSERT INTO categories (id, name, description, icon, color, display_order, is_active, shop_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
    `).run(
      id,
      data.name,
      data.description || null,
      data.icon || null,
      data.color || '#6366f1',
      data.displayOrder ?? 0,
      shopId,
      now,
      now
    )

    // Phase 08: enqueue category.created sync event
    const categoryRow = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Record<string, unknown>
    const syncCtx: CategorySyncEventContext = {
      businessId: asBusinessId(shopId),
      originatingDeviceId: asDeviceId(session?.deviceId ?? 'desktop'),
      originatingEmployeeId: asEmployeeId(session?.employeeId ?? ''),
      clientSequence: Date.now(),
    }
    const syncEvent = buildCategorySyncEvent('create', { ...categoryRow, id: categoryRow.id as string, version: 1 }, syncCtx)
    getRealSyncEngine().enqueue(syncEvent).catch(() => {})

    pushCategory(id).catch(() => {})
    return db.prepare('SELECT * FROM categories WHERE id = ? AND shop_id = ?').get(id, shopId)
  })

  ipcMain.handle('db:categories:update', async (_event, id: string, rawData: unknown) => {
    const session = await desktopLoadSession()
    const data = categoryUpdateSchema.parse(rawData)
    const db = getDatabase()
    const now = new Date().toISOString()
    const shopId = await resolveActiveShopId()

    const fields: string[] = []
    const values: (string | number | null)[] = []

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description || null) }
    if (data.icon !== undefined) { fields.push('icon = ?'); values.push(data.icon || null) }
    if (data.color !== undefined) { fields.push('color = ?'); values.push(data.color || null) }
    if (data.displayOrder !== undefined) { fields.push('display_order = ?'); values.push(data.displayOrder ?? 0) }
    if (data.isActive !== undefined) { fields.push('is_active = ?'); values.push(data.isActive ? 1 : 0) }

    fields.push('updated_at = ?')
    values.push(now, id, shopId)

    db.prepare(`UPDATE categories SET ${fields.join(', ')} WHERE id = ? AND shop_id = ?`).run(...values)

    // Phase 08: enqueue category.updated sync event
    const categoryRow = db.prepare('SELECT * FROM categories WHERE id = ? AND shop_id = ?').get(id, shopId) as Record<string, unknown> | undefined
    if (categoryRow) {
      const syncCtx: CategorySyncEventContext = {
        businessId: asBusinessId(shopId),
        originatingDeviceId: asDeviceId(session?.deviceId ?? 'desktop'),
        originatingEmployeeId: asEmployeeId(session?.employeeId ?? ''),
        clientSequence: Date.now(),
      }
      const syncEvent = buildCategorySyncEvent('update', { ...categoryRow, id: categoryRow.id as string, version: Number(categoryRow.version ?? 1) }, syncCtx)
      getRealSyncEngine().enqueue(syncEvent).catch(() => {})
    }

    pushCategory(id).catch(() => {})
    return db.prepare('SELECT * FROM categories WHERE id = ? AND shop_id = ?').get(id, shopId)
  })

  ipcMain.handle('db:categories:delete', async (_event, id: string) => {
    const db = getDatabase()
    const shopId = await resolveActiveShopId()
    db.prepare('UPDATE categories SET is_active = 0 WHERE id = ? AND shop_id = ?').run(id, shopId)
    pushCategory(id).catch(() => {})
  })

  log.info('Category IPC handlers registered')
}
