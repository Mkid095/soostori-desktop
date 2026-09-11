/**
 * desktop-notifications.ts — Phase 17 Electron Notification service.
 *
 * Composes showDesktopNotification from desktop-notification-popup.ts with
 * sync-event mapping for the notification service layer.
 */

import log from 'electron-log'
import type { NotificationPriority } from '../database/schema-notifications'
import { showDesktopNotification } from './desktop-notification-popup'
import type { NotificationEventType } from '../database/schema-notifications'

export type { NotificationEventType, NotificationPriority }
export { showDesktopNotification }

/**
 * Map a sync event from the cloud timer worker to an OS notification.
 */
export async function notifyFromSyncEvent(event: {
  name: string
  payload: Record<string, unknown>
  priority?: NotificationPriority
}): Promise<void> {
  const priority = event.priority ?? 'normal'
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
