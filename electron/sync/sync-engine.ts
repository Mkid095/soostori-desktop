/**
 * sync-engine.ts — Real FIDScript sync engine for Desktop.
 *
 * Cycle 05 Phase 05: replaces NoOpSyncEngine with real enqueue/pull/apply.
 * Uses CloudClient (FIDScript REST) for cloud communication and local
 * SQLite for local persistence and cursor tracking.
 *
 * Key semantics:
 * - enqueue: writes SyncEvent to local sync_events table. Idempotent on key.
 * - pull: queries cloud for events since lastSyncAt for active businessId.
 * - apply: applies a single SyncEvent to local SQLite. Business isolation
 *   enforced — events for other businessIds are silently dropped.
 */

import { getDatabase } from '../database'
import { CloudClient } from '@soostori/cloud'
import type { SyncEvent, SyncCursor } from '@soostori/contracts'
import { resolveActiveShopId } from '../database/active-shop'
import { asSyncEventId, asIdempotencyKey, asBusinessId, asDeviceId, asEmployeeId } from '@soostori/core'
import log from 'electron-log'

const APP_ID = process.env.INSTANT_APP_ID || ''

/** Real sync engine that speaks FIDScript. */
export class RealSyncEngine {
  private readonly appId: string
  private readonly db: ReturnType<typeof getDatabase>
  private cloud: CloudClient | null = null
  private readonly processedKeys = new Set<string>()

  constructor(appId: string) {
    this.appId = appId
    this.db = getDatabase()
  }

  /** Inject the cloud client once auth is established. */
  setCloudClient(client: CloudClient): void {
    this.cloud = client
  }

  // ── enqueue ────────────────────────────────────────────────────────────────

  async enqueue(event: SyncEvent): Promise<{ state: 'queued' | 'acked' | 'rejected' }> {
    try {
      const existing = this.db.prepare(
        'SELECT id FROM sync_events WHERE idempotency_key = ?'
      ).get(event.idempotencyKey)
      if (existing) {
        return { state: 'queued' }
      }

      this.db.prepare(`
        INSERT INTO sync_events
          (id, shop_id, device_id, event_type, payload, idempotency_key, version, timestamp, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        event.id,
        event.businessId,
        event.originatingDeviceId,
        event.entityKind,
        JSON.stringify(event.payload),
        event.idempotencyKey,
        event.entityVersion,
        event.clientCreatedAt,
        new Date().toISOString(),
      )
      this.processedKeys.add(event.idempotencyKey)
      log.debug(`RealSyncEngine: enqueued event ${event.id} (${event.entityKind})`)
      return { state: 'queued' }
    } catch (err) {
      log.warn('RealSyncEngine: enqueue failed', err)
      return { state: 'rejected' }
    }
  }

  // ── pull ──────────────────────────────────────────────────────────────────

  async pull(cursor: SyncCursor): Promise<SyncEvent[]> {
    if (!this.cloud) {
      log.debug('RealSyncEngine: pull called but cloud client not set')
      return []
    }
    if (!this.appId) return []

    const shopId = (cursor.businessId as string) || (await resolveActiveShopId())
    try {
      const whereClause: Record<string, unknown> = { shopId: shopId as string }
      if (cursor.lastServerReceivedAt) {
        whereClause['syncedAt'] = { $gt: cursor.lastServerReceivedAt }
      }

      const query = {
        syncEvents: {
          $: {
            where: whereClause,
            limit: 100,
          },
        },
      }

      const result = await this.cloud.query(query)
      const rawRows = (result as { syncEvents?: Array<Record<string, unknown>> }).syncEvents ?? []
      const events: SyncEvent[] = []

      for (const row of rawRows) {
        const key = String(row.id ?? '')
        if (this.processedKeys.has(key)) continue

        // Business isolation
        if (row.shopId && (row.shopId as string) !== shopId) continue
        this.processedKeys.add(key)

        const rawPayload = row.payload
        const parsed = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : (rawPayload ?? {})

        events.push({
          id: asSyncEventId(String(row.id ?? '')),
          idempotencyKey: asIdempotencyKey(String(row.idempotencyKey ?? row.id ?? '')),
          businessId: asBusinessId(String(row.shopId ?? shopId)),
          entityKind: String(row.entity ?? 'unknown') as SyncEvent['entityKind'],
          entityId: String(row.entityId ?? ''),
          operation: 'create',
          originatingDeviceId: asDeviceId(String(row.deviceId ?? '')),
          originatingEmployeeId: asEmployeeId(''),
          clientSequence: Number(row.clientSequence ?? 0),
          clientCreatedAt: String(row.syncedAt ?? row.createdAt ?? new Date().toISOString()),
          entityVersion: Number(row.version ?? 1),
          payload: parsed as SyncEvent['payload'],
          state: 'replayed',
        })
      }

      log.debug(`RealSyncEngine: pulled ${events.length} events`)
      return events
    } catch (err) {
      log.warn('RealSyncEngine: pull failed', err)
      return []
    }
  }

  // ── apply ─────────────────────────────────────────────────────────────────

  async apply(_local: unknown, event: SyncEvent): Promise<{
    state: 'applied' | 'no_op' | 'conflict_replay' | 'version_older'
    entityVersion?: number
    localEntityVersion?: number
    eventEntityVersion?: number
  }> {
    if (this.processedKeys.has(event.idempotencyKey)) {
      return { state: 'no_op' }
    }

    const shopId = await resolveActiveShopId()
    if (event.businessId && (event.businessId as string) !== shopId) {
      log.debug(`RealSyncEngine: apply rejecting event for businessId=${event.businessId} (active=${shopId})`)
      this.processedKeys.add(event.idempotencyKey)
      return { state: 'no_op' }
    }

    const db = this.db

    if (event.entityKind === 'product') {
      const p = event.payload as {
        id?: string
        name?: string
        selling_price?: number
        current_stock?: number
        sku?: string
        barcode?: string
      }
      const productId = p.id ?? event.entityId
      if (!productId) {
        this.processedKeys.add(event.idempotencyKey)
        return { state: 'no_op' }
      }

      if (event.operation === 'create' || event.operation === 'update') {
        const existing = db.prepare(
          'SELECT version FROM products WHERE id = ?'
        ).get(productId) as { version?: number } | undefined

        if (existing && existing.version !== undefined && existing.version > event.entityVersion) {
          this.processedKeys.add(event.idempotencyKey)
          return {
            state: 'version_older',
            localEntityVersion: existing.version,
            eventEntityVersion: event.entityVersion,
          }
        }

        if (existing) {
          const updates: string[] = ['updated_at = ?']
          const vals: unknown[] = [new Date().toISOString()]
          if (p.name !== undefined) { updates.push('name = ?'); vals.push(p.name) }
          if (p.selling_price !== undefined) { updates.push('selling_price = ?'); vals.push(p.selling_price) }
          if (p.current_stock !== undefined) { updates.push('current_stock = ?'); vals.push(p.current_stock) }
          vals.push(productId)
          db.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`).run(...vals)
          db.prepare('UPDATE products SET version = ? WHERE id = ?').run(event.entityVersion, productId)
        } else {
          db.prepare(`
            INSERT OR IGNORE INTO products
              (id, name, selling_price, current_stock, stock_quantity, track_inventory, is_active, shop_id, created_at, updated_at, version)
            VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?, ?, ?)
          `).run(
            productId,
            p.name ?? 'Unknown',
            p.selling_price ?? 0,
            p.current_stock ?? 0,
            p.current_stock ?? 0,
            event.businessId,
            new Date().toISOString(),
            new Date().toISOString(),
            event.entityVersion,
          )
        }

        this.processedKeys.add(event.idempotencyKey)
        return { state: 'applied', entityVersion: event.entityVersion }
      }
    }

    this.processedKeys.add(event.idempotencyKey)
    return { state: 'no_op' }
  }
}

// ── Singleton ────────────────────────────────────────────────────────────────

let _engine: RealSyncEngine | null = null

export function getRealSyncEngine(): RealSyncEngine {
  if (!_engine) {
    _engine = new RealSyncEngine(APP_ID)
  }
  return _engine
}

/** Inject cloud client into the real engine. Call after auth. */
export function injectCloudClient(client: CloudClient): void {
  getRealSyncEngine().setCloudClient(client)
}
