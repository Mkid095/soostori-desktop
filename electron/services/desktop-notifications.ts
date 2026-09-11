/**
 * desktop-notifications.ts — Phase 17 Electron Notification popup service.
 *
 * Uses Electron's native Notification API for OS-native notification popups.
 * Shows popup when:
 * - App is NOT focused (BrowserWindow.isFocused() === false)
 * - Priority is 'urgent' or 'high' (always shown regardless of focus)
 * - 'low' priority: badge only, no popup
 *
 * Also persists the notification to SQLite via IPC so it appears in the
 * in-app NotificationsPage.
 */

import { Notification, BrowserWindow } from 'electron'
import { getMainWindow } from '../window-manager'
import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'
import { getEmployeeId } from './cloud-auth'
import { resolveActiveShopId } from '../database/active-shop'
import type { NotificationEventType, NotificationPriority } from '../database/schema-notifications'

export interface DesktopNotificationInput {
  title: string
  body: string
  eventType: NotificationEventType
  payload?: Record<string, unknown>
  priority?: NotificationPriority
  userId?: string
  silent?: boolean   // if true, never show OS popup (badge only)
}

/**
 * Show an OS-native notification AND persist to the SQLite notifications table.
 * Respects:
 * - urgent → always show OS popup
 * - high → show OS popup if app not focused
 * - normal / low → badge only, no popup
 */
export async function showDesktopNotification(input: DesktopNotificationInput): Promise<string> {
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

  // Always persist to SQLite
  db.prepare(`
    INSERT INTO notifications (id, business_id, user_id, event_type, payload, priority, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, shopId, uid, eventType, JSON.stringify({ ...payload, title, body }), priority, now)

  // Determine if we should show the OS popup
  const showPopup = silent ? false : shouldShowPopup(priority)
  if (!showPopup) {
    log.info(`[DesktopNotifications] ${priority}/${eventType}: no popup (silent=${silent})`)
    return id
  }

  const mainWindow = getMainWindow()
  const isFocused = mainWindow ? mainWindow.isFocused() : false

  // urgent always shows; high/normal shows only if backgrounded
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
    // Bring window to front and navigate to notifications page
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

function shouldShowPopup(priority: NotificationPriority): boolean {
  return priority === 'urgent' || priority === 'high' || priority === 'normal'
}

/**
 * Called by sync-timer-worker after applying events from cloud.
 * Maps SyncEvent → DesktopNotificationInput and fires.
 */
export async function notifyFromSyncEvent(event: {
  name: string
  payload: Record<string, unknown>
  priority?: NotificationPriority
}): Promise<void> {
  const priority = event.priority ?? 'normal'

  // Map sync event name to title/body
  const title = titleForEvent(event.name)
  const body = bodyForEvent(event.name, event.payload)

  await showDesktopNotification({
    title,
    body,
    eventType: event.name as NotificationEventType,
    payload: event.payload,
    priority,
    silent: priority === 'low',
  })
}

function titleForEvent(name: string): string {
  const map: Record<string, string> = {
    'sale.created': 'New Sale',
    'sale.refunded': 'Refund Processed',
    'debt.created': 'New Debt',
    'debt.payment_recorded': 'Debt Payment',
    'debt.settled': 'Debt Settled',
    'expense.created': 'Expense Logged',
    'inventory.low_stock': 'Low Stock Alert',
    'inventory.received': 'Stock Received',
    'commission.created': 'Commission Earned',
  }
  return map[name] ?? 'Notification'
}

function bodyForEvent(name: string, payload: Record<string, unknown>): string {
  if (name === 'sale.created' && payload.total) return `Sale completed: ${payload.total}`
  if (name === 'debt.payment_recorded' && payload.amount) return `Payment of ${payload.amount} recorded`
  if (name === 'inventory.low_stock' && payload.productName) return `${payload.productName} is low on stock`
  if (payload.message) return String(payload.message)
  return ''
}
