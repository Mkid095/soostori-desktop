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

  /**
   * Persist the sync cursor to SQLite so it survives restarts.
   * On crash after pull/apply, the next pull will re-read from the same point.
   */
  persistCursor(deviceId: string, businessId: string, lastSyncAt: string): void {
    try {
      this.db.prepare(`
        INSERT OR REPLACE INTO sync_cursor (device_id, business_id, cursor_id, last_sync_at)
        VALUES (?, ?, ?, ?)
      `).run(deviceId, businessId, `cursor-${businessId}`, lastSyncAt)
    } catch (err) {
      log.warn('RealSyncEngine: failed to persist cursor', err)
    }
  }

  /**
   * Load the persisted cursor for a (deviceId, businessId) pair.
   * Returns null if no cursor has been stored yet.
   */
  loadCursor(deviceId: string, businessId: string): string | null {
    try {
      const row = this.db.prepare(
        'SELECT last_sync_at FROM sync_cursor WHERE device_id = ? AND business_id = ?'
      ).get(deviceId, businessId) as { last_sync_at: string } | undefined
      return row?.last_sync_at ?? null
    } catch (err) {
      log.warn('RealSyncEngine: failed to load cursor', err)
      return null
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
    // ── sale ───────────────────────────────────────────────────────────────
    if (event.entityKind === 'sale') {
      const s = event.payload as {
        id?: string
        status?: string
        total_amount?: number
        subtotal?: number
        discount_amount?: number
        tax_amount?: number
        paid_amount?: number
        payment_method?: string
        note?: string | null
        customer_id?: string | null
        customer_id_number?: string | null
        type?: string
        items_summary?: string | null
        version?: number
        idempotency_key?: string
      }
      const saleId = s.id ?? event.entityId
      if (!saleId) {
        this.processedKeys.add(event.idempotencyKey)
        this.persistProcessedKey(event.idempotencyKey, event.id, event.originatingDeviceId as string)
        return { state: 'no_op' }
      }

      if (event.operation === 'delete' || event.operation === 'tombstone') {
        db.prepare(
          "UPDATE sales SET status = 'cancelled', updated_at = ? WHERE id = ? AND shop_id = ?"
        ).run(new Date().toISOString(), saleId, event.businessId)
        this.processedKeys.add(event.idempotencyKey)
        this.persistProcessedKey(event.idempotencyKey, event.id, event.originatingDeviceId as string)
        return { state: 'applied' }
      }

      if (event.operation === 'update') {
        // version check — skip if cloud event is older than local
        const existingSale = db.prepare(
          'SELECT id FROM sales WHERE id = ?'
        ).get(saleId)
        if (existingSale) {
          // sale exists — check if we already have a more recent version
          // For now apply updates blindly since sales table has no version col
          const updates: string[] = ['updated_at = ?']
          const vals: unknown[] = [new Date().toISOString()]
          if (s.status !== undefined) { updates.push('status = ?'); vals.push(s.status) }
          if (s.paid_amount !== undefined) { updates.push('paid_amount = ?'); vals.push(s.paid_amount) }
          if (s.note !== undefined) { updates.push('note = ?'); vals.push(s.note) }
          vals.push(saleId)
          db.prepare(`UPDATE sales SET ${updates.join(', ')} WHERE id = ?`).run(...vals)
        }
        this.processedKeys.add(event.idempotencyKey)
        this.persistProcessedKey(event.idempotencyKey, event.id, event.originatingDeviceId as string)
        return { state: 'applied' }
      }

      // create — idempotent on sale.id
      const existingSale = db.prepare('SELECT id FROM sales WHERE id = ?').get(saleId)
      if (existingSale) {
        this.processedKeys.add(event.idempotencyKey)
        this.persistProcessedKey(event.idempotencyKey, event.id, event.originatingDeviceId as string)
        return { state: 'no_op' }
      }
      db.prepare(`
        INSERT OR IGNORE INTO sales
          (id, type, status, subtotal, discount_amount, tax_amount, total_amount,
           paid_amount, payment_method, note, customer_id, customer_id_number,
           shop_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        saleId,
        s.type ?? 'retail',
        s.status ?? 'completed',
        s.subtotal ?? 0,
        s.discount_amount ?? 0,
        s.tax_amount ?? 0,
        s.total_amount ?? 0,
        s.paid_amount ?? 0,
        s.payment_method ?? 'cash',
        s.note ?? null,
        s.customer_id ?? null,
        s.customer_id_number ?? null,
        event.businessId,
        new Date().toISOString(),
        new Date().toISOString(),
      )
      this.processedKeys.add(event.idempotencyKey)
      this.persistProcessedKey(event.idempotencyKey, event.id, event.originatingDeviceId as string)
      return { state: 'applied' }
    }

    // ── expense ───────────────────────────────────────────────────────────
    if (event.entityKind === 'expense') {
      const ex = event.payload as {
        id?: string
        amount?: number
        category?: string
        note?: string | null
        date?: string
        status?: string
        paid_at?: string | null
        idempotency_key?: string
      }
      const expenseId = ex.id ?? event.entityId
      if (!expenseId) {
        this.processedKeys.add(event.idempotencyKey)
        this.persistProcessedKey(event.idempotencyKey, event.id, event.originatingDeviceId as string)
        return { state: 'no_op' }
      }

      if (event.operation === 'update') {
        const existingExp = db.prepare(
          'SELECT id FROM expenses WHERE id = ? AND shop_id = ?'
        ).get(expenseId, event.businessId)
        if (existingExp) {
          const updates: string[] = ['amount = COALESCE(?, amount)', 'category = COALESCE(?, category)']
          const vals: unknown[] = [ex.amount ?? null, ex.category ?? null]
          if (ex.note !== undefined) { updates.push('note = ?'); vals.push(ex.note) }
          if (ex.status !== undefined) { updates.push('status = ?'); vals.push(ex.status) }
          if (ex.paid_at !== undefined) { updates.push('paid_at = ?'); vals.push(ex.paid_at) }
          vals.push(expenseId)
          db.prepare(`UPDATE expenses SET ${updates.join(', ')} WHERE id = ?`).run(...vals)
        }
        this.processedKeys.add(event.idempotencyKey)
        this.persistProcessedKey(event.idempotencyKey, event.id, event.originatingDeviceId as string)
        return { state: 'applied' }
      }

      // create
      const existingExp = db.prepare(
        'SELECT id FROM expenses WHERE id = ? AND shop_id = ?'
      ).get(expenseId, event.businessId)
      if (existingExp) {
        this.processedKeys.add(event.idempotencyKey)
        this.persistProcessedKey(event.idempotencyKey, event.id, event.originatingDeviceId as string)
        return { state: 'no_op' }
      }
      db.prepare(`
        INSERT OR IGNORE INTO expenses
          (id, amount, category, note, date, shop_id, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        expenseId,
        ex.amount ?? 0,
        ex.category ?? 'other',
        ex.note ?? '',
        ex.date ?? new Date().toISOString().split('T')[0],
        event.businessId,
        ex.status ?? 'pending',
        new Date().toISOString(),
      )
      this.processedKeys.add(event.idempotencyKey)
      this.persistProcessedKey(event.idempotencyKey, event.id, event.originatingDeviceId as string)
      return { state: 'applied' }
    }

    // ── category ──────────────────────────────────────────────────────────
    if (event.entityKind === 'category') {
      const cat = event.payload as {
        id?: string
        name?: string
        description?: string | null
        icon?: string | null
        color?: string | null
        display_order?: number
        is_active?: boolean
        idempotency_key?: string
      }
      const categoryId = cat.id ?? event.entityId
      if (!categoryId) {
        this.processedKeys.add(event.idempotencyKey)
        this.persistProcessedKey(event.idempotencyKey, event.id, event.originatingDeviceId as string)
        return { state: 'no_op' }
      }

      if (event.operation === 'delete' || event.operation === 'tombstone') {
        db.prepare(
          'UPDATE categories SET is_active = 0 WHERE id = ? AND shop_id = ?'
        ).run(categoryId, event.businessId)
        this.processedKeys.add(event.idempotencyKey)
        this.persistProcessedKey(event.idempotencyKey, event.id, event.originatingDeviceId as string)
        return { state: 'applied' }
      }

      if (event.operation === 'update') {
        const existingCat = db.prepare(
          'SELECT id FROM categories WHERE id = ?'
        ).get(categoryId)
        if (existingCat) {
          const updates: string[] = ['updated_at = ?']
          const vals: unknown[] = [new Date().toISOString()]
          if (cat.name !== undefined) { updates.push('name = ?'); vals.push(cat.name) }
          if (cat.description !== undefined) { updates.push('description = ?'); vals.push(cat.description) }
          if (cat.icon !== undefined) { updates.push('icon = ?'); vals.push(cat.icon) }
          if (cat.color !== undefined) { updates.push('color = ?'); vals.push(cat.color) }
          if (cat.display_order !== undefined) { updates.push('display_order = ?'); vals.push(cat.display_order) }
          if (cat.is_active !== undefined) { updates.push('is_active = ?'); vals.push(cat.is_active ? 1 : 0) }
          vals.push(categoryId)
          db.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`).run(...vals)
        }
        this.processedKeys.add(event.idempotencyKey)
        this.persistProcessedKey(event.idempotencyKey, event.id, event.originatingDeviceId as string)
        return { state: 'applied' }
      }

      // create
      const existingCat = db.prepare('SELECT id FROM categories WHERE id = ?').get(categoryId)
      if (existingCat) {
        this.processedKeys.add(event.idempotencyKey)
        this.persistProcessedKey(event.idempotencyKey, event.id, event.originatingDeviceId as string)
        return { state: 'no_op' }
      }
      db.prepare(`
        INSERT OR IGNORE INTO categories
          (id, name, description, icon, color, display_order, is_active, shop_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        categoryId,
        cat.name ?? 'Unknown',
        cat.description ?? null,
        cat.icon ?? null,
        cat.color ?? '#6366f1',
        cat.display_order ?? 0,
        cat.is_active !== undefined ? (cat.is_active ? 1 : 0) : 1,
        event.businessId,
        new Date().toISOString(),
        new Date().toISOString(),
      )
      this.processedKeys.add(event.idempotencyKey)
      this.persistProcessedKey(event.idempotencyKey, event.id, event.originatingDeviceId as string)
      return { state: 'applied' }
    }

    // ── debtPayment ───────────────────────────────────────────────────────
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
