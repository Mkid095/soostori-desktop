/**
 * notification-queries.ts — Phase 17 notification query helpers.
 *
 * Pure SQLite query helpers (sync) used by notification-handlers.ts.
 * These must remain in the main process — not called directly from renderer.
 */

import { getDatabase } from '../database'
import { resolveActiveShopId } from '../database/active-shop'
import { getEmployeeId } from '../services/cloud-auth'
import { desktopLoadSession } from '../auth/electron-store-session'

export interface ListNotificationsOptions {
  limit?: number
  offset?: number
  eventType?: string
  unreadOnly?: boolean
}

export interface NotificationRow {
  id: string
  business_id: string
  user_id: string
  event_type: string
  payload: string
  priority: string
  created_at: string
  read_at: string | null
}

// ── Session helpers (main process only) ────────────────────────────────────────

export async function getUserId(): Promise<string> {
  const session = await desktopLoadSession()
  if (session?.employeeId) return session.employeeId
  const eid = getEmployeeId()
  if (eid) return eid
  return 'system'
}

export async function resolveShopId(): Promise<string> {
  return (await resolveActiveShopId()) ?? 'local'
}

// ── Query helpers ─────────────────────────────────────────────────────────────

export function listNotifications(
  userId: string,
  options?: ListNotificationsOptions
) {
  const db = getDatabase()
  const limit = options?.limit ?? 50
  const offset = options?.offset ?? 0

  let sql = `SELECT * FROM notifications WHERE user_id = ?`
  const params: unknown[] = [userId]

  if (options?.eventType) {
    sql += ` AND event_type = ?`
    params.push(options.eventType)
  }
  if (options?.unreadOnly) {
    sql += ` AND read_at IS NULL`
  }

  sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`
  params.push(limit, offset)

  const rows = db.prepare(sql).all(...params) as NotificationRow[]

  const total = db.prepare(
    `SELECT COUNT(*) as n FROM notifications WHERE user_id = ?${
      options?.unreadOnly ? ' AND read_at IS NULL' : ''
    }`
  ).get(userId) as { n: number }

  return {
    items: rows.map(r => ({ ...r, payload: JSON.parse(r.payload) })),
    total: total.n,
    hasMore: offset + rows.length < total.n,
  }
}

export function createNotification(params: {
  shopId: string
  userId: string
  eventType: string
  payload?: Record<string, unknown>
  priority?: string
}): string {
  const db = getDatabase()
  const { shopId, userId, eventType, payload = {}, priority = 'normal' } = params
  const { v4: uuidv4 } = require('uuid')
  const id = uuidv4()
  const now = new Date().toISOString()

  db.prepare(`
    INSERT INTO notifications (id, business_id, user_id, event_type, payload, priority, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, shopId, userId, eventType, JSON.stringify(payload), priority, now)

  return id
}

export function getUnreadCount(userId: string): number {
  const db = getDatabase()
  const row = db.prepare(
    `SELECT COUNT(*) as n FROM notifications WHERE user_id = ? AND read_at IS NULL`
  ).get(userId) as { n: number }
  return row.n
}
