/**
 * desktop-notification-popup.ts — Phase 17 OS-native notification popup.
 *
 * Shows an Electron native Notification popup when the app is backgrounded
 * (or priority is urgent/high), and persists the notification to SQLite.
 *
 * Exported so desktop-notifications.ts can compose with other notification paths.
 */

import { Notification, BrowserWindow } from 'electron'
import { getMainWindow } from '../window-manager'
import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'
import { getEmployeeId } from './cloud-auth'
import { resolveActiveShopId } from '../database/active-shop'
import type {
  NotificationEventType,
  NotificationPriority,
} from '../database/schema-notifications'

export interface DesktopNotificationInput {
  title: string
  body: string
  eventType: NotificationEventType
  payload?: Record<string, unknown>
  priority?: NotificationPriority
  userId?: string
  silent?: boolean
}

function shouldShowPopup(priority: NotificationPriority): boolean {
  return priority === 'urgent' || priority === 'high' || priority === 'normal'
}

/**
 * Show an OS-native notification AND persist to SQLite.
 * Respects: urgent → always show; high → show if app not focused;
 * normal/low → badge only, no popup.
 */
export async function showDesktopNotification(
  input: DesktopNotificationInput
): Promise<string> {
  const {
    title,
    body,
    eventType,
    payload = {},
    priority = 'normal',
    userId,
    silent = false,
  } = input

  const db = getDatabase()
  const shopId = (await resolveActiveShopId()) ?? 'local'
  const uid = userId ?? getEmployeeId() ?? 'system'
  const id = uuidv4()
  const now = new Date().toISOString()

  db.prepare(`
    INSERT INTO notifications (id, business_id, user_id, event_type, payload, priority, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, shopId, uid, eventType, JSON.stringify({ ...payload, title, body }), priority, now)

  const showPopup = silent ? false : shouldShowPopup(priority)
  if (!showPopup) {
    log.info(`[DesktopNotifications] ${priority}/${eventType}: no popup (silent=${silent})`)
    return id
  }

  const mainWindow = getMainWindow()
  const isFocused = mainWindow ? mainWindow.isFocused() : false

  const shouldFire = priority === 'urgent' || !isFocused
  if (!shouldFire) {
    log.info(`[DesktopNotifications] suppressed: app focused, priority=${priority}`)
    return id
  }

  if (!Notification.isSupported()) {
    log.warn('[DesktopNotifications] Notification.isSupported() = false, skipping OS popup')
    return id
  }

  const notif = new Notification({
    title,
    body,
    silent: priority === 'low',
  })

  notif.on('click', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
      mainWindow.webContents.send('notification:clicked', { id, eventType, payload })
    }
  })

  notif.on('close', () => {
    log.info(`[DesktopNotifications] closed: ${id}`)
  })

  notif.show()
  log.info(`[DesktopNotifications] shown: ${id} (${eventType}, ${priority})`)
  return id
}
