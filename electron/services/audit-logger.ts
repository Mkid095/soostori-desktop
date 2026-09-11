/**
 * audit-logger.ts — Canonical audit event logger backed by SQLite.
 *
 * Phase 18: All desktop mutation handlers emit structured audit events here.
 * Events are written to the `audit_logs` table and synced to cloud as
 * `audit_log` entity kind via the RealSyncEngine apply() loop.
 *
 * Event shape matches the FIDScript audit_log entity used by Mobile/Web.
 */

import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'

export interface AuditEvent {
  eventName: string            // e.g. 'sale.created', 'product.updated'
  entityKind?: string          // e.g. 'sale', 'product', 'debt'
  entityId?: string
  actorType: 'employee' | 'system' | 'cloud'
  actorId?: string             // employeeId or deviceId
  shopId?: string
  metadata?: Record<string, unknown>
}

/**
 * Persist an audit event to the local audit_logs table.
 * This table feeds the sync engine's audit_log entity kind.
 */
export function logAuditEvent(event: AuditEvent): void {
  const db = getDatabase()
  const now = new Date().toISOString()
  const payload = event.metadata ? JSON.stringify(event.metadata) : null

  try {
    db.prepare(`
      INSERT INTO audit_logs
        (id, shop_id, user_id, device_id, action, entity_type, entity_id, payload, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      event.shopId ?? 'default',
      event.actorType === 'employee' ? (event.actorId ?? 'unknown') : null,
      event.actorType === 'system' ? (event.actorId ?? null) : null,
      event.eventName,
      event.entityKind ?? null,
      event.entityId ?? null,
      payload,
      now,
    )
    log.debug(`[Audit] ${event.eventName} | entity=${event.entityKind}:${event.entityId} | actor=${event.actorType}:${event.actorId}`)
  } catch (err) {
    log.warn('[Audit] Failed to write audit log:', err)
  }
}

/**
 * Convenience helpers for common event shapes.
 */
export const audit = {
  saleCreated(saleId: string, shopId: string, actorId: string, metadata: Record<string, unknown>): void {
    logAuditEvent({ eventName: 'sale.created', entityKind: 'sale', entityId: saleId, actorType: 'employee', actorId, shopId, metadata })
  },
  productCreated(productId: string, shopId: string, actorId: string, metadata?: Record<string, unknown>): void {
    logAuditEvent({ eventName: 'product.created', entityKind: 'product', entityId: productId, actorType: 'employee', actorId, shopId, metadata })
  },
  productUpdated(productId: string, shopId: string, actorId: string, metadata?: Record<string, unknown>): void {
    logAuditEvent({ eventName: 'product.updated', entityKind: 'product', entityId: productId, actorType: 'employee', actorId, shopId, metadata })
  },
  productArchived(productId: string, shopId: string, actorId: string): void {
    logAuditEvent({ eventName: 'product.archived', entityKind: 'product', entityId: productId, actorType: 'employee', actorId, shopId })
  },
  debtCreated(debtId: string, shopId: string, actorId: string, metadata: Record<string, unknown>): void {
    logAuditEvent({ eventName: 'debt.created', entityKind: 'debt', entityId: debtId, actorType: 'employee', actorId, shopId, metadata })
  },
  debtPaymentRecorded(debtId: string, shopId: string, actorId: string, metadata: Record<string, unknown>): void {
    logAuditEvent({ eventName: 'debt.payment_recorded', entityKind: 'debt', entityId: debtId, actorType: 'employee', actorId, shopId, metadata })
  },
  debtSettled(debtId: string, shopId: string, actorId: string): void {
    logAuditEvent({ eventName: 'debt.settled', entityKind: 'debt', entityId: debtId, actorType: 'employee', actorId, shopId })
  },
  expenseCreated(expenseId: string, shopId: string, actorId: string, metadata: Record<string, unknown>): void {
    logAuditEvent({ eventName: 'expense.created', entityKind: 'expense', entityId: expenseId, actorType: 'employee', actorId, shopId, metadata })
  },
  stockAdjusted(productId: string, shopId: string, actorId: string, metadata: Record<string, unknown>): void {
    logAuditEvent({ eventName: 'inventory.adjusted', entityKind: 'product', entityId: productId, actorType: 'employee', actorId, shopId, metadata })
  },
  deviceEnrolled(deviceId: string, shopId: string, actorId: string): void {
    logAuditEvent({ eventName: 'device.enrolled', entityKind: 'device', entityId: deviceId, actorType: 'system', actorId, shopId })
  },
  shopSettingsUpdated(shopId: string, actorId: string, metadata: Record<string, unknown>): void {
    logAuditEvent({ eventName: 'shop.settings.updated', entityKind: 'shop', entityId: shopId, actorType: 'employee', actorId, shopId, metadata })
  },
}
