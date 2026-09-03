/**
 * cloud-sync.ts — Synchronises local SQLite data with InstantDB.
 *
 * Push: local events/settings → cloud via instaml
 * Pull: cloud settings → local SQLite
 */

import { getDatabase } from '../database'
import * as instant from './instant-api'
import log from 'electron-log'

const APP_ID = process.env.INSTANT_APP_ID || ''

function nowIso(): string {
  return new Date().toISOString()
}

// ── Push sync events ──────────────────────────────────────────────────────────

export async function pushSyncEvents(): Promise<number> {
  if (!APP_ID) return 0
  const db = getDatabase()
  try {
    const rows = db.prepare(
      "SELECT id, entity_type, entity_id, operation, payload FROM sync_events WHERE synced_at IS NULL ORDER BY created_at"
    ).all() as Array<{ id: string; entity_type: string; entity_id: string; operation: string; payload: string }>

    if (!rows.length) return 0
    const steps = rows.map(r => [
      'update', 'syncEvents', r.id, {
        entity: r.entity_type, entityId: r.entity_id,
        operation: r.operation, payload: r.payload, syncedAt: nowIso(),
      }
    ])
    await instant.instamlTx(APP_ID, steps)
    log.info(`cloudSync: pushed ${rows.length} events`)
    return rows.length
  } catch (err) {
    log.warn('cloudSync: pushSyncEvents failed', err)
    return 0
  }
}

// ── Push shop settings ────────────────────────────────────────────────────────

export async function pushShopSettings(): Promise<void> {
  if (!APP_ID) return
  const db = getDatabase()
  try {
    const rows = db.prepare("SELECT key, value FROM shop_settings ORDER BY key").all() as Array<{ key: string; value: string }>
    if (!rows.length) return
    const steps = rows.map(r => ['update', 'shops', r.key, { value: r.value }])
    await instant.instamlTx(APP_ID, steps)
    log.info(`cloudSync: pushed ${rows.length} settings`)
  } catch (err) {
    log.warn('cloudSync: pushShopSettings failed', err)
  }
}

// ── Pull shop settings ────────────────────────────────────────────────────────

export async function pullShopSettings(): Promise<boolean> {
  if (!APP_ID) return false
  try {
    const result = await instant.instaqQuery(APP_ID, { shops: { $: { where: {} } } })
    const shops = (result as { shops?: unknown[] })?.shops ?? []
    if (!shops.length) return false
    const db = getDatabase()
    for (const s of shops) {
      const row = s as Record<string, unknown>
      const shopId = String(row.id ?? '')
      if (!shopId) continue
      if (row.name) db.prepare("INSERT OR REPLACE INTO shop_settings (key, value) VALUES ('shop_name', ?)").run(String(row.name))
      if (row.plan) db.prepare("INSERT OR REPLACE INTO shop_settings (key, value) VALUES ('cloud_plan', ?)").run(String(row.plan))
    }
    log.info('cloudSync: pulled shop settings')
    return true
  } catch (err) {
    log.warn('cloudSync: pullShopSettings failed', err)
    return false
  }
}

// ── Device heartbeat ──────────────────────────────────────────────────────────

export async function pushDeviceHeartbeat(deviceId: string): Promise<void> {
  if (!APP_ID) return
  try {
    const db = getDatabase()
    const device = db.prepare('SELECT device_name, is_lan_host FROM devices WHERE id = ?').get(deviceId) as { device_name: string; is_lan_host: number } | undefined
    if (!device) return
    await instant.instamlTx(APP_ID, [[
      'update', 'devices', deviceId, { lastSeenAt: nowIso(), status: device.is_lan_host ? 'active' : 'idle' }
    ]])
  } catch (err) {
    log.warn('cloudSync: pushDeviceHeartbeat failed', err)
  }
}

// ── Subscription check ────────────────────────────────────────────────────────

export interface CloudSubscription {
  valid: boolean; plan: string | null; deviceLimit: number | null; expiryDate: string | null
}

export async function checkCloudSubscription(): Promise<CloudSubscription> {
  if (!APP_ID) return { valid: true, plan: null, deviceLimit: null, expiryDate: null }
  try {
    const result = await instant.instaqQuery(APP_ID, {
      subscriptions: { $: { where: { status: 'active' }, limit: 1 } }
    })
    const subs = (result as { subscriptions?: unknown[] })?.subscriptions ?? []
    if (!subs.length) return { valid: true, plan: null, deviceLimit: null, expiryDate: null }
    const sub = subs[0] as Record<string, unknown>
    const expiry = sub.currentPeriodEnd as string | undefined
    return {
      valid: true, plan: (sub.planKey ?? 'trial') as string,
      deviceLimit: (sub.deviceLimit as number | undefined) ?? null,
      expiryDate: expiry ?? null,
    }
  } catch {
    return { valid: true, plan: null, deviceLimit: null, expiryDate: null }
  }
}

// ── Full snapshot ─────────────────────────────────────────────────────────────

export async function pushFullSnapshot(): Promise<void> {
  if (!APP_ID) return
  const db = getDatabase()
  try {
    const rows = db.prepare(
      "SELECT id, event_type, payload, created_at FROM sync_events ORDER BY sequence_number DESC LIMIT 100"
    ).all() as Array<{ id: string; event_type: string; payload: string; created_at: string }>
    if (!rows.length) return
    const steps = rows.map(r => ['update', 'syncEvents', r.id, {
      entity: r.event_type, payload: r.payload, syncedAt: r.created_at, operation: 'snapshot'
    }])
    await instant.instamlTx(APP_ID, steps)
    log.info(`cloudSync: full sync pushed (${rows.length} events)`)
  } catch (err) {
    log.warn('cloudSync: pushFullSnapshot failed', err)
  }
}
