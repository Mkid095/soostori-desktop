/**
 * notification-handlers.ts — Phase 17 Notifications IPC handlers.
 *
 * Handlers:
 * - notifications:list          — paginated notification list for a user
 * - notifications:markRead     — mark one notification as read
 * - notifications:markAllRead  — mark all user notifications as read
 * - notifications:create       — create a new notification record
 * - notificationPreferences:get — get user channel preferences
 * - notificationPreferences:set — update a channel preference
 */

import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'
import { resolveActiveShopId } from '../database/active-shop'
import { getEmployeeId } from '../services/cloud-auth'
import { desktopLoadSession } from '../auth/electron-store-session'
import type {
  NotificationEventType,
  NotificationPriority,
} from '../database/schema-notifications'

// ── Helpers ────────────────────────────────────────────────────────────────────

function getUserId(): string {
  // Try session first
  const session = desktopLoadSession()
  if (session?.employeeId) return session.employeeId
  // Fall back to cloud-auth
  const eid = getEmployeeId()
  if (eid) return eid
  return 'system'
}

function resolveShopId(): string {
  return resolveActiveShopId() as string ?? 'local'
}

// ── List ───────────────────────────────────────────────────────────────────────

function listNotifications(
  userId: string,
  options?: { limit?: number; offset?: number; eventType?: string; unreadOnly?: boolean }
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

  const rows = db.prepare(sql).all(...params) as {
    id: string; business_id: string; user_id: string
    event_type: string; payload: string; priority: string
    created_at: string; read_at: string | null
  }[]

  const total = db.prepare(
    `SELECT COUNT(*) as n FROM notifications WHERE user_id = ?${options?.unreadOnly ? ' AND read_at IS NULL' : ''}`
  ).get(userId) as { n: number }

  return {
    items: rows.map(r => ({ ...r, payload: JSON.parse(r.payload) })),
    total: total.n,
    hasMore: offset + rows.length < total.n,
  }
}

// ── Register handlers ──────────────────────────────────────────────────────────

export function registerNotificationHandlers(): void {
  ipcMain.handle('notifications:list', async (_event, opts?: {
    limit?: number; offset?: number; eventType?: string; unreadOnly?: boolean
  }) => {
    const userId = getUserId()
    return listNotifications(userId, opts)
  })

  ipcMain.handle('notifications:markRead', async (_event, id: string) => {
    const userId = getUserId()
    const db = getDatabase()
    db.prepare(
      `UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ?`
    ).run(new Date().toISOString(), id, userId)
    log.info(`[NotificationHandlers] marked read: ${id}`)
    return { ok: true }
  })

  ipcMain.handle('notifications:markAllRead', async () => {
    const userId = getUserId()
    const db = getDatabase()
    db.prepare(
      `UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL`
    ).run(new Date().toISOString(), userId)
    log.info(`[NotificationHandlers] mark all read for ${userId}`)
    return { ok: true }
  })

  ipcMain.handle('notifications:create', async (_event, data: {
    eventType: NotificationEventType
    payload?: Record<string, unknown>
    priority?: NotificationPriority
    userId?: string
  }) => {
    const db = getDatabase()
    const userId = data.userId ?? getUserId()
    const shopId = resolveShopId()
    const id = uuidv4()

    db.prepare(`
      INSERT INTO notifications (id, business_id, user_id, event_type, payload, priority, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, shopId, userId, data.eventType, JSON.stringify(data.payload ?? {}),
      data.priority ?? 'normal', new Date().toISOString())

    log.info(`[NotificationHandlers] created: ${id} (${data.eventType})`)
    return { id }
  })

  ipcMain.handle('notificationPreferences:get', async () => {
    const userId = getUserId()
    const db = getDatabase()
    const rows = db.prepare(
      `SELECT * FROM notification_preferences WHERE user_id = ?`
    ).all(userId) as {
      id: string; user_id: string; event_type: string; channel: string; enabled: number
    }[]
    return rows.map(r => ({ ...r, enabled: Boolean(r.enabled) }))
  })

  ipcMain.handle('notificationPreferences:set', async (_event, data: {
    eventType: string
    channel: string
    enabled: boolean
  }) => {
    const userId = getUserId()
    const db = getDatabase()
    const id = uuidv4()
    db.prepare(`
      INSERT INTO notification_preferences (id, user_id, event_type, channel, enabled)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id, event_type, channel) DO UPDATE SET enabled = excluded.enabled
    `).run(id, userId, data.eventType, data.channel, data.enabled ? 1 : 0)
    log.info(`[NotificationHandlers] pref set: ${data.eventType}/${data.channel} = ${data.enabled}`)
    return { ok: true }
  })

  ipcMain.handle('notifications:unreadCount', async () => {
    const userId = getUserId()
    const db = getDatabase()
    const row = db.prepare(
      `SELECT COUNT(*) as n FROM notifications WHERE user_id = ? AND read_at IS NULL`
    ).get(userId) as { n: number }
    return row.n
  })

  log.info('[NotificationHandlers] registered')
}
