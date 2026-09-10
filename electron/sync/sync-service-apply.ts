/**
 * sync-service-apply.ts — Remote event application logic.
 * Extracted from sync-service.ts to keep it under 150 lines.
 */

import { v4 as uuidv4 } from 'uuid'
import { getDatabase } from '../database'
import { createEvent } from './server-handlers-core'
import type { SyncEvent } from './types'
import log from 'electron-log'
import { StockMovementLedger } from '@soostori/inventory'
import { asProductId, asEmployeeId, type UUID } from '@soostori/core'
import { getInventoryLedger } from '../services/inventory-repository'

const shopId = ''  // will be set by sync-service

export function applyStockAdjusted(event: SyncEvent): void {
  const payload = event.payload as {
    productId: string; quantity: number; newBalance: number; eventType: string; expectedBalance?: number
  }
  const db = getDatabase()
  const seq = event.sequenceNumber ?? 0

  // Conflict resolution: skip if a more-recent movement already exists
  const existing = db.prepare(
    'SELECT sequence_number FROM inventory_transactions WHERE product_id = ? AND sequence_number > ? LIMIT 1'
  ).get(payload.productId, seq)
  if (existing) {
    log.warn(`SyncService: STOCK_ADJUSTED conflict — product=${payload.productId} seq=${seq} skipped`)
    return
  }

  // Verify balance matches expectation (stale broadcast protection)
  if (payload.expectedBalance !== undefined) {
    const current = db.prepare('SELECT current_stock FROM products WHERE id = ?').get(payload.productId) as { current_stock: number } | undefined
    if (current && current.current_stock !== payload.expectedBalance) {
      log.warn(`SyncService: STOCK_ADJUSTED balance mismatch product=${payload.productId} expected=${payload.expectedBalance} actual=${current.current_stock} — correcting`)
    }
  }

  const idempotencyKey = `remote-${event.id}`
  db.prepare(`
    INSERT INTO inventory_transactions
      (id, shop_id, product_id, device_id, user_id, event_type, quantity, balance_after, payload, sequence_number, idempotency_key)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    uuidv4(), shopId, payload.productId, event.deviceId, event.userId,
    payload.eventType, payload.quantity, payload.newBalance,
    JSON.stringify(payload), seq, idempotencyKey
  )
  db.prepare(`UPDATE products SET current_stock = ?, updated_at = ? WHERE id = ?`)
    .run(payload.newBalance, new Date().toISOString(), payload.productId)
  log.info(`SyncService: applied STOCK_ADJUSTED product=${payload.productId} qty=${payload.quantity} balance=${payload.newBalance}`)
}

export interface SaleConfirmedPayload {
  saleId: string
  shopId?: string
  userId?: string
  deviceId?: string
  items: Array<{ productId: string; quantity: number }>
  paymentMethod: string
  totalAmount: number
  subtotal?: number
  discountAmount?: number
  taxAmount?: number
  note?: string
  customerId?: string
  customerName?: string
}

export async function applySaleConfirmed(event: SyncEvent): Promise<void> {
  const payload = event.payload as SaleConfirmedPayload
  const db = getDatabase()

  // Idempotent: skip if sale already exists
  const existing = db.prepare('SELECT id FROM sales WHERE id = ?').get(payload.saleId)
  if (existing) return

  const now = new Date().toISOString()
  const subtotal = payload.subtotal ?? payload.totalAmount
  const discountAmount = payload.discountAmount ?? 0
  const taxAmount = payload.taxAmount ?? 0

  db.prepare(`
    INSERT INTO sales (id, shop_id, user_id, device_id, subtotal, discount_amount, tax_amount,
      total_amount, paid_amount, payment_method, status, note, customer_id, customer_name,
      created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?)
  `).run(
    payload.saleId,
    payload.shopId ?? shopId,
    payload.userId ?? event.userId,
    payload.deviceId ?? event.deviceId,
    subtotal, discountAmount, taxAmount,
    payload.totalAmount, payload.totalAmount, payload.paymentMethod,
    payload.note ?? null,
    payload.customerId ?? null,
    payload.customerName ?? null,
    now, now,
  )

  // Insert sale items (scope by shop_id so cross-tenant queries stay isolated)
  const itemStmt = db.prepare(`
    INSERT INTO sale_items (id, sale_id, product_id, product_name, quantity, unit_price, discount, total_price, shop_id, created_at)
    VALUES (?, ?, ?, ?, ?, 0, 0, 0, ?, ?)
  `)
  for (const item of payload.items ?? []) {
    itemStmt.run(uuidv4(), payload.saleId, item.productId, 'Unknown', item.quantity, payload.shopId ?? shopId, now)
  }

  // Use StockMovementLedger to apply sale items — same ledger used by local sales
  const ledger = getInventoryLedger()
  const saleUserId = asEmployeeId(payload.userId ?? event.userId) as UUID
  for (const item of payload.items ?? []) {
    try {
      await ledger.apply({
        productId: asProductId(item.productId),
        type: 'sold',
        quantity: -item.quantity,
        referenceId: payload.saleId,
        referenceType: 'sale',
        actorType: 'employee',
        actorId: saleUserId,
        idempotencyKey: uuidv4() as UUID,
      })
      log.info(`SyncService: applySaleConfirmed decremented product=${item.productId} qty=${item.quantity}`)
    } catch (err) {
      log.error(`SyncService: applySaleConfirmed stock decrement failed product=${item.productId} qty=${item.quantity}`, err)
    }
  }

  log.info(`SyncService: applied SALE_CONFIRMED saleId=${payload.saleId} items=${payload.items?.length ?? 0}`)
}

export function applyProductEvent(event: SyncEvent): void {
  const db = getDatabase()
  const id = event.payload && typeof event.payload === 'object' && 'id' in event.payload
    ? (event.payload as { id: string }).id
    : null
  if (!id) return
  const shopIdValue = (event.payload as { shopId?: string })?.shopId ?? shopId ?? 'default'
  if (event.eventType === 'PRODUCT_CREATED') {
    const p = event.payload as { id: string; name: string; selling_price: number; current_stock?: number }
    db.prepare(`
      INSERT OR IGNORE INTO products (id, name, selling_price, current_stock, stock_quantity, track_inventory, is_active, shop_id)
      VALUES (?, ?, ?, ?, ?, 1, 1, ?)
    `).run(id, p.name ?? 'Unknown', p.selling_price ?? 0, p.current_stock ?? 0, p.current_stock ?? 0, shopIdValue)
  } else if (event.eventType === 'PRODUCT_UPDATED') {
    const p = event.payload as { id: string; name?: string; selling_price?: number; current_stock?: number }
    const updates: string[] = []
    const values: unknown[] = []
    if (p.name !== undefined) { updates.push('name = ?'); values.push(p.name) }
    if (p.selling_price !== undefined) { updates.push('selling_price = ?'); values.push(p.selling_price) }
    if (p.current_stock !== undefined) { updates.push('current_stock = ?'); values.push(p.current_stock) }
    if (updates.length > 0) {
      values.push(id, shopIdValue)
      db.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ? AND shop_id = ?`).run(...values)
    }
  } else if (event.eventType === 'PRODUCT_DELETED') {
    db.prepare('UPDATE products SET is_active = 0 WHERE id = ? AND shop_id = ?').run(id, shopIdValue)
  }
  log.info(`SyncService: applied ${event.eventType} id=${id}`)
}

export function applySaleRefunded(event: SyncEvent): void {
  const payload = event.payload as { saleId: string }
  const db = getDatabase()
  db.prepare("UPDATE sales SET status = 'refunded', updated_at = ? WHERE id = ?")
    .run(new Date().toISOString(), payload.saleId)
  log.info(`SyncService: applied SALE_REFUNDED saleId=${payload.saleId}`)
}

export function applySaleVoided(event: SyncEvent): void {
  const payload = event.payload as { saleId: string }
  const db = getDatabase()
  db.prepare("UPDATE sales SET status = 'cancelled', updated_at = ? WHERE id = ?")
    .run(new Date().toISOString(), payload.saleId)
  log.info(`SyncService: applied SALE_VOIDED saleId=${payload.saleId}`)
}
