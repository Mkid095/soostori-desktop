/**
 * notification-handlers.ts — Phase 17 Notifications IPC handlers.
 *
 * Handlers:
 * - notifications:list          — paginated notification list for a user
 * - notifications:markRead     — mark one notification as read
 * - notifications:markAllRead  — mark all user notifications as read
 * - notifications:create       — create a new notification record
 * - notifications:unreadCount  — count of unread notifications
 * - notificationPreferences:get — get user channel preferences
 * - notificationPreferences:set — update a channel preference
 */

import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'
import {
  getUserId,
  resolveShopId,
  listNotifications,
  createNotification,
  getUnreadCount,
} from './notification-queries'

export function registerNotificationHandlers(): void {
  ipcMain.handle('notifications:list', async (_event, opts?: {
    limit?: number
    offset?: number
    eventType?: string
    unreadOnly?: boolean
  }) => {
    const userId = await getUserId()
    return listNotifications(userId, opts)
  })

  ipcMain.handle('notifications:markRead', async (_event, id: string) => {
    const userId = await getUserId()
    const db = getDatabase()
    db.prepare(
      `UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ?`
    ).run(new Date().toISOString(), id, userId)
    log.info(`[NotificationHandlers] marked read: ${id}`)
    return { ok: true }
  })

  ipcMain.handle('notifications:markAllRead', async () => {
    const userId = await getUserId()
    const db = getDatabase()
    db.prepare(
      `UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL`
    ).run(new Date().toISOString(), userId)
    log.info(`[NotificationHandlers] mark all read for ${userId}`)
    return { ok: true }
  })

  ipcMain.handle('notifications:create', async (_event, data: {
    eventType: string
    payload?: Record<string, unknown>
    priority?: string
    userId?: string
  }) => {
    const userId = data.userId ?? await getUserId()
    const shopId = await resolveShopId()
    const id = createNotification({
      shopId,
      userId,
      eventType: data.eventType,
      payload: data.payload,
      priority: data.priority,
    })
    log.info(`[NotificationHandlers] created: ${id} (${data.eventType})`)
    return { id }
  })

  ipcMain.handle('notificationPreferences:get', async () => {
    const userId = await getUserId()
    const db = getDatabase()
    const rows = db.prepare(
      `SELECT * FROM notification_preferences WHERE user_id = ?`
    ).all(userId) as {
      id: string; user_id: string; event_type: string
      channel: string; enabled: number
    }[]
    return rows.map(r => ({ ...r, enabled: Boolean(r.enabled) }))
  })

  ipcMain.handle('notificationPreferences:set', async (_event, data: {
    eventType: string
    channel: string
    enabled: boolean
  }) => {
    const userId = await getUserId()
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
    const userId = await getUserId()
    return getUnreadCount(userId)
  })

  log.info('[NotificationHandlers] registered')
}
