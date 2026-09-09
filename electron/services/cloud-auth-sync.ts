/**
 * cloud-auth-sync.ts — Sync cloud employees/shops into local SQLite.
 */

import { getDatabase } from '../database'
import * as instant from './instant-api'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'

const APP_ID = process.env.INSTANT_APP_ID || ''

export interface CloudEmployee {
  id: string; shopId: string; name: string; role: string; status: string
}

export interface CloudShop {
  id: string; name: string; currency: string; slug: string; taxRate: number
}

export async function syncDevicesFromCloud(shopId: string): Promise<void> {
  if (!APP_ID) return
  try {
    const result = await instant.instaqQuery(APP_ID, { devices: { $: { where: { shopId } } } })
    const devs = (result as { devices?: unknown[] })?.devices ?? []
    const db = getDatabase()
    const now = new Date().toISOString()

    for (const d of devs) {
      const dev = d as Record<string, unknown>
      const deviceId = String(dev.deviceId ?? '')
      if (!deviceId) continue
      const hasPin = dev.hasPin === true || dev.hasPin === 1 ? 1 : 0
      const pinSetupAt = dev.pinSetupAt ? String(dev.pinSetupAt) : null
      const isPrimary = dev.isPrimary === true || dev.isPrimary === 1 ? 1 : 0
      db.prepare(`UPDATE devices SET device_name=?, is_primary=?, cloud_has_pin=?, cloud_pin_setup_at=?, last_seen=? WHERE device_id=?`)
        .run(String(dev.deviceName ?? 'POS'), isPrimary, hasPin, pinSetupAt, now, deviceId)
    }
    log.info(`syncDevicesFromCloud: ${devs.length} devices for shop ${shopId}`)
  } catch (err) { log.warn('syncDevicesFromCloud failed', err) }
}

export async function syncInvitationsFromCloud(shopId: string): Promise<void> {
  if (!APP_ID) return
  try {
    const result = await instant.instaqQuery(APP_ID, { invitations: { $: { where: { shopId } } } })
    const invs = (result as { invitations?: unknown[] })?.invitations ?? []
    const db = getDatabase()

    for (const inv of invs) {
      const i = inv as Record<string, unknown>
      const code = String(i.code ?? '')
      if (!code) continue
      const usedAt = i.usedAt ? String(i.usedAt) : null
      db.prepare(`UPDATE invitations SET cloud_used_at=? WHERE code=?`)
        .run(usedAt, code)
    }
    log.info(`syncInvitationsFromCloud: ${invs.length} invitations for shop ${shopId}`)
  } catch (err) { log.warn('syncInvitationsFromCloud failed', err) }
}

export async function syncEmployeesFromCloud(shopId: string): Promise<Array<{ id: string; cloudId: string; name: string; role: string; isActive: number }>> {
  if (!APP_ID) return []
  try {
    const result = await instant.instaqQuery(APP_ID, { employees: { $: { where: { shopId } } } })
    const emps = (result as { employees?: Array<Record<string, unknown>> })?.employees ?? []
    const db = getDatabase()
    const now = new Date().toISOString()
    const resultCache: Array<{ id: string; cloudId: string; name: string; role: string; isActive: number }> = []

    for (const e of emps) {
      const emp = e as Record<string, unknown>
      const cloudId = String(emp.id ?? '')
      const name = String(emp.name ?? 'Unknown')
      const role = String(emp.role ?? 'attendant')
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
      resultCache.push({ id: existing?.id ?? uuidv4(), cloudId, name, role, isActive })
    }
    log.info(`syncEmployeesFromCloud: ${resultCache.length} for shop ${shopId}`)
    return resultCache
  } catch (err) { log.warn('syncEmployeesFromCloud failed', err); return [] }
}

export async function syncShopFromCloud(deviceId: string): Promise<CloudShop | null> {
  if (!APP_ID) return null
  try {
    const devResult = await instant.instaqQuery(APP_ID, { devices: { $: { where: { deviceId } } } })
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
    log.info(`syncShopFromCloud: "${shop.name}"`)
    return shop
  } catch (err) { log.warn('syncShopFromCloud failed', err); return null }
}
