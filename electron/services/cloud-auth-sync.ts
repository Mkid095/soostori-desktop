/**
 * cloud-auth-sync.ts — Sync cloud entities into local SQLite.
 *
 * syncEmployeesFromCloud(shopId) — upserts employees from cloud into local DB
 * syncShopFromCloud(deviceId) — resolves and upserts the shop for a device
 */

import { getDatabase } from '../database'
import * as instant from './instant-api'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'
import type { EmployeeCache } from './cloud-auth'

const APP_ID = process.env.INSTANT_APP_ID || ''

export interface CloudShop { id: string; name: string; currency: string; slug: string; taxRate: number }

export async function syncEmployeesFromCloud(shopId: string): Promise<EmployeeCache[]> {
  if (!APP_ID) return []
  try {
    const result = await instant.instaqQuery(APP_ID, { employees: { $: { where: { shopId } } } })
    const emps = (result as { employees?: Array<Record<string, unknown>> })?.employees ?? []
    const db = getDatabase()
    const now = new Date().toISOString()
    const cache: EmployeeCache[] = []
    for (const e of emps) {
      const emp = e as Record<string, unknown>
      const cloudId = String(emp.id ?? '')
      const name = String(emp.name ?? 'Unknown')
      const role = String(emp.role ?? 'cashier')
      const isActive = (emp.status === 'active' || emp.status === 'enabled') ? 1 : 0
      const existing = db.prepare('SELECT id FROM employees WHERE cloud_id = ?').get(cloudId) as { id: string } | undefined
      if (existing) {
        db.prepare('UPDATE employees SET name=?, role=?, is_active=?, updated_at=? WHERE cloud_id=?')
          .run(name, role, isActive, now, cloudId)
      } else {
        db.prepare(`INSERT OR IGNORE INTO employees (id, cloud_id, shop_id, name, role, pin_hash, pin_salt, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, '', '', ?, ?, ?)`)
          .run(uuidv4(), cloudId, shopId, name, role, isActive, now, now)
      }
      cache.push({ id: existing?.id ?? uuidv4(), cloudId, shopId, name, role, pinHash: '', pinSalt: '', isActive })
    }
    log.info(`syncEmployeesFromCloud: ${cache.length} employees for shop ${shopId}`)
    return cache
  } catch (err) { log.warn('syncEmployeesFromCloud failed', err); return [] }
}

export async function syncShopFromCloud(deviceId: string): Promise<CloudShop | null> {
  if (!APP_ID) return null
  try {
    const devResult = await instant.instaqQuery(APP_ID, { devices: { $: { where: { id: deviceId } } } })
    const devs = (devResult as { devices?: unknown[] })?.devices ?? []
    if (!devs.length) return null
    const cloudShopId = String((devs[0] as Record<string, unknown>).shopId ?? '')
    if (!cloudShopId || cloudShopId === 'null') return null

    const shopResult = await instant.instaqQuery(APP_ID, { shops: { $: { where: { id: cloudShopId } } } })
    const shops = (shopResult as { shops?: unknown[] })?.shops ?? []
    if (!shops.length) return null
    const s = shops[0] as Record<string, unknown>
    const shop: CloudShop = {
      id: String(s.id), name: String(s.name ?? 'My Shop'),
      currency: String(s.currency ?? 'KES'), slug: String(s.slug ?? ''),
      taxRate: Number(s.taxRate) || 0,
    }
    const db = getDatabase()
    const existing = db.prepare('SELECT id FROM shops WHERE id = ?').get(shop.id)
    if (existing) {
      db.prepare('UPDATE shops SET name=?, currency=?, updated_at=? WHERE id=?')
        .run(shop.name, shop.currency, new Date().toISOString(), shop.id)
    } else {
      db.prepare('INSERT OR IGNORE INTO shops (id, name, currency, created_at) VALUES (?, ?, ?, ?)')
        .run(shop.id, shop.name, shop.currency, new Date().toISOString())
    }
    log.info(`syncShopFromCloud: "${shop.name}" (${shop.id})`)
    return shop
  } catch (err) { log.warn('syncShopFromCloud failed', err); return null }
}
