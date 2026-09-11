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
    this.loadProcessedKeys()
  }

  /** Load processed idempotency keys from the persistent sync_processed table. */
  private loadProcessedKeys(): void {
    try {
      const rows = this.db.prepare(
        `SELECT idempotency_key FROM sync_processed LIMIT 10000`
      ).all() as Array<{ idempotency_key: string }>
      for (const row of rows) {
        this.processedKeys.add(row.idempotency_key)
      }
      log.debug(`RealSyncEngine: loaded ${this.processedKeys.size} processed keys`)
    } catch (err) {
      log.warn('RealSyncEngine: failed to load processed keys', err)
    }
  }

  /** Persist an idempotency key to sync_processed so it survives app restarts. */
  private persistProcessedKey(idempotencyKey: string, eventId: string, deviceId: string): void {
    try {
      const { v4: uuidv4 } = require('uuid')
      this.db.prepare(`
        INSERT OR IGNORE INTO sync_processed (id, device_id, idempotency_key, event_id, processed_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(uuidv4(), deviceId, idempotencyKey, eventId, new Date().toISOString())
    } catch (err) {
      log.warn('RealSyncEngine: failed to persist processed key', err)
    }
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
          (id, shop_id, device_id, event_type, sequence_number, payload, idempotency_key, version, timestamp, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        event.id,
        event.businessId,
        event.originatingDeviceId,
        event.entityKind,
        0, // sequence_number managed by cloud pull; enqueue uses 0 as placeholder
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
        const idempKey = String(row.idempotencyKey ?? row.id ?? '')

        // Check persistent dedup: query sync_processed table (not just in-memory Set)
        const alreadyProcessed = this.db.prepare(
          `SELECT 1 FROM sync_processed WHERE device_id = ? AND idempotency_key = ? LIMIT 1`
        ).get(row.shopId as string, idempKey)

        if (alreadyProcessed || this.processedKeys.has(key)) {
          this.processedKeys.add(key) // keep in-memory in sync
          continue
        }

        // Business isolation
        if (row.shopId && (row.shopId as string) !== shopId) continue
        this.processedKeys.add(key)
        this.persistProcessedKey(idempKey, key, row.shopId as string)

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
      this.persistProcessedKey(event.idempotencyKey, event.id, event.originatingDeviceId as string)
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
        this.persistProcessedKey(event.idempotencyKey, event.id, event.originatingDeviceId as string)
        return { state: 'no_op' }
      }

      if (event.operation === 'create' || event.operation === 'update') {
        const existing = db.prepare(
          'SELECT version FROM products WHERE id = ?'
        ).get(productId) as { version?: number } | undefined

        if (existing && existing.version !== undefined && existing.version > event.entityVersion) {
          this.processedKeys.add(event.idempotencyKey)
          this.persistProcessedKey(event.idempotencyKey, event.id, event.originatingDeviceId as string)
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
        this.persistProcessedKey(event.idempotencyKey, event.id, event.originatingDeviceId as string)
        return { state: 'applied', entityVersion: event.entityVersion }
      }
    }

    // ── customer ─────────────────────────────────────────────────────────
    if (event.entityKind === 'customer') {
      const c = event.payload as {
        id?: string; name?: string; phone?: string | null; email?: string | null
        id_number?: string | null; address?: string | null; notes?: string | null
        status?: string; idempotency_key?: string
      }
      const customerId = c.id ?? event.entityId
      if (!customerId) {
        this.processedKeys.add(event.idempotencyKey)
        return { state: 'no_op' }
      }

      if (event.operation === 'delete' || event.operation === 'tombstone') {
        db.prepare(
          'UPDATE customers SET is_active = 0 WHERE id = ? AND shop_id = ?'
        ).run(customerId, event.businessId)
        this.processedKeys.add(event.idempotencyKey)
        return { state: 'applied' }
      }

      // create / update
      const existing = db.prepare(
        'SELECT version FROM customers WHERE id = ?'
      ).get(customerId) as { version?: number } | undefined

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
        if (c.name !== undefined) { updates.push('name = ?'); vals.push(c.name) }
        if (c.phone !== undefined) { updates.push('phone = ?'); vals.push(c.phone) }
        if (c.email !== undefined) { updates.push('email = ?'); vals.push(c.email) }
        if (c.id_number !== undefined) { updates.push('id_number = ?'); vals.push(c.id_number) }
        if (c.address !== undefined) { updates.push('address = ?'); vals.push(c.address) }
        if (c.notes !== undefined) { updates.push('notes = ?'); vals.push(c.notes) }
        if (c.status !== undefined) {
          updates.push('is_active = ?')
          vals.push(c.status === 'active' ? 1 : 0)
        }
        updates.push('version = ?')
        vals.push(event.entityVersion, customerId)
        db.prepare(`UPDATE customers SET ${updates.join(', ')} WHERE id = ?`).run(...vals)
      } else {
        db.prepare(`
          INSERT OR IGNORE INTO customers
            (id, name, phone, email, id_number, address, notes, is_active,
             idempotency_key, shop_id, version, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          customerId,
          c.name ?? 'Unknown',
          c.phone ?? null,
          c.email ?? null,
          c.id_number ?? null,
          c.address ?? null,
          c.notes ?? null,
          c.status === 'active' ? 1 : 0,
          event.idempotencyKey,
          event.businessId,
          event.entityVersion,
          new Date().toISOString(),
          new Date().toISOString(),
        )
      }

      this.processedKeys.add(event.idempotencyKey)
      return { state: 'applied', entityVersion: event.entityVersion }
    }

    // ── debt ───────────────────────────────────────────────────────────────
    if (event.entityKind === 'debt') {
      const d = event.payload as {
        id?: string; customer_id?: string; sale_id?: string | null
        amount?: number; status?: string; due_date?: string | null; notes?: string | null
        version?: number
      }
      const debtId = d.id ?? event.entityId
      if (!debtId) {
        this.processedKeys.add(event.idempotencyKey)
        return { state: 'no_op' }
      }

      if (event.operation === 'delete' || event.operation === 'tombstone') {
        db.prepare('UPDATE debts SET status = ? WHERE id = ? AND shop_id = ?')
          .run('written_off', debtId, event.businessId)
        this.processedKeys.add(event.idempotencyKey)
        return { state: 'applied' }
      }

      const existing = db.prepare(
        'SELECT version FROM debts WHERE id = ?'
      ).get(debtId) as { version?: number } | undefined

      if (existing && existing.version !== undefined && existing.version > event.entityVersion) {
        this.processedKeys.add(event.idempotencyKey)
        return { state: 'version_older', localEntityVersion: existing.version, eventEntityVersion: event.entityVersion }
      }

      if (existing) {
        const updates: string[] = ['updated_at = ?']
        const vals: unknown[] = [new Date().toISOString()]
        if (d.customer_id !== undefined) { updates.push('customer_id = ?'); vals.push(d.customer_id) }
        if (d.sale_id !== undefined) { updates.push('sale_id = ?'); vals.push(d.sale_id) }
        if (d.amount !== undefined) { updates.push('amount = ?'); vals.push(d.amount) }
        if (d.status !== undefined) { updates.push('status = ?'); vals.push(d.status) }
        if (d.due_date !== undefined) { updates.push('due_date = ?'); vals.push(d.due_date) }
        if (d.notes !== undefined) { updates.push('notes = ?'); vals.push(d.notes) }
        if (d.version !== undefined) { updates.push('version = ?'); vals.push(d.version) }
        else { updates.push('version = ?'); vals.push(event.entityVersion) }
        vals.push(debtId)
        db.prepare(`UPDATE debts SET ${updates.join(', ')} WHERE id = ?`).run(...vals)
      } else {
        db.prepare(`
          INSERT OR IGNORE INTO debts
            (id, customer_id, sale_id, amount, status, due_date, notes,
             shop_id, created_at, updated_at, version)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          debtId,
          d.customer_id ?? null,
          d.sale_id ?? null,
          d.amount ?? 0,
          d.status ?? 'pending',
          d.due_date ?? null,
          d.notes ?? null,
          event.businessId,
          new Date().toISOString(),
          new Date().toISOString(),
          d.version ?? event.entityVersion,
        )
      }

      this.processedKeys.add(event.idempotencyKey)
      return { state: 'applied', entityVersion: d.version ?? event.entityVersion }
    }

    // ── debtPayment ────────────────────────────────────────────────────────
    if (event.entityKind === 'debtPayment') {
      const p = event.payload as {
        id?: string; debt_id?: string; amount?: number
        payment_method?: string; payment_ref?: string | null; reference?: string | null
        shop_id?: string; version?: number
      }
      const paymentId = p.id ?? event.entityId
      if (!paymentId) {
        this.processedKeys.add(event.idempotencyKey)
        return { state: 'no_op' }
      }

      // Idempotent: skip if already recorded
      const existingPay = db.prepare(
        'SELECT id FROM debt_payments WHERE idempotency_key = ?'
      ).get(event.idempotencyKey)
      if (existingPay) {
        this.processedKeys.add(event.idempotencyKey)
        return { state: 'no_op' }
      }

      const shopId = p.shop_id ?? event.businessId

      db.prepare(`
        INSERT OR IGNORE INTO debt_payments
          (id, debt_id, amount, payment_method, reference, shop_id, created_at, version, idempotency_key)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        paymentId,
        p.debt_id ?? '',
        p.amount ?? 0,
        p.payment_method ?? 'cash',
        p.payment_ref ?? p.reference ?? null,
        shopId,
        new Date().toISOString(),
        p.version ?? event.entityVersion,
        event.idempotencyKey,
      )

      // Recompute balance and update cached amount_paid on debt
      if (p.debt_id) {
        const debt = db.prepare(
          'SELECT amount FROM debts WHERE id = ?'
        ).get(p.debt_id) as { amount: number } | undefined
        if (debt) {
          const paidRow = db.prepare(
            'SELECT COALESCE(SUM(amount), 0) as paid FROM debt_payments WHERE debt_id = ?'
          ).get(p.debt_id) as { paid: number }
          const newBalance = debt.amount - paidRow.paid
          const newStatus = newBalance <= 0 ? 'paid' : 'partial'
          db.prepare(
            'UPDATE debts SET amount_paid = ?, status = ?, updated_at = ? WHERE id = ?'
          ).run(paidRow.paid, newStatus, new Date().toISOString(), p.debt_id)
        }
      }

      this.processedKeys.add(event.idempotencyKey)
      return { state: 'applied', entityVersion: p.version ?? event.entityVersion }
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
