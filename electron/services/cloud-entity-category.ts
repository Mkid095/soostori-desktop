/**
 * cloud-entity-category.ts — Category push/pull to cloud InstantDB.
 * Part of cloud-entity-sync split per ANPAS (≤150 lines per file).
 */

import { getDatabase } from '../database'
import * as instant from './instant-api'
import log from 'electron-log'

const APP_ID = process.env.INSTANT_APP_ID || ''

export async function pushCategory(categoryId: string): Promise<void> {
  if (!APP_ID) return
  const db = getDatabase()
  const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(categoryId) as Record<string, unknown> | undefined
  if (!cat) return

  try {
    await instant.instamlTx(APP_ID, [[
      'update', 'categories', categoryId, {
        id: categoryId,
        shopId: (cat.shop_id as string) ?? '',
        name: cat.name as string,
        color: cat.color as string | null,
        description: cat.description as string | null,
        isActive: cat.is_active as number ?? 1,
        createdAt: cat.created_at as string,
        updatedAt: new Date().toISOString(),
      }
    ]])
  } catch (err) {
    log.warn('pushCategory failed:', err)
  }
}

export async function pushAllCategories(): Promise<number> {
  if (!APP_ID) return 0
  const db = getDatabase()
  try {
    const rows = db.prepare('SELECT id FROM categories').all() as Array<{ id: string }>
    for (const row of rows) await pushCategory(row.id)
    return rows.length
  } catch { return 0 }
}

export async function pullCategories(shopId: string): Promise<number> {
  if (!APP_ID) return 0
  const db = getDatabase()
  try {
    const result = await instant.instaqQuery(APP_ID, { categories: { $: { where: { shopId } } } })
    const rows = (result as { categories?: unknown[] }).categories ?? []
    let count = 0
    for (const row of rows) {
      const c = row as Record<string, unknown>
      const localId = String(c.id ?? '').replace(/^categories_/, '')
      if (!localId) continue
      db.prepare(`
        INSERT OR REPLACE INTO categories (id, name, description, icon, color, display_order, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(localId, (c.name as string) || '', (c.description as string) || null, null,
        (c.color as string) || null, 0, (c.isActive as number) ?? 1)
      count++
    }
    log.debug(`pullCategories: pulled ${count} categories`)
    return count
  } catch (err) {
    log.warn('pullCategories failed:', err)
    return 0
  }
}
