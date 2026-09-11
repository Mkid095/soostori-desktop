/**
 * schema-notifications.ts — Phase 17 Notifications SQLite tables.
 *
 * Tables:
 * - notifications: per-user in-app notification store
 * - notification_preferences: per-user, per-event-type channel preferences
 */

import { getDatabase } from './index'

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'
export type NotificationEventType =
  | 'sale.created' | 'sale.refunded'
  | 'debt.created' | 'debt.payment_recorded' | 'debt.settled'
  | 'expense.created' | 'expense.approved' | 'expense.paid'
  | 'inventory.low_stock' | 'inventory.received' | 'inventory.adjusted'
  | 'team.invitation_sent' | 'team.member_added' | 'team.role_changed'
  | 'device.enrolled' | 'device.approved' | 'device.revoked' | 'device.primary_changed'
  | 'commission.created' | 'commission.paid'
  | 'system.error' | 'sync.complete'

export interface NotificationRow {
  id: string
  business_id: string
  user_id: string
  event_type: NotificationEventType
  payload: string          // JSON
  priority: NotificationPriority
  created_at: string
  read_at: string | null
}

export interface NotificationPreferencesRow {
  id: string
  user_id: string
  event_type: NotificationEventType | '*'
  channel: string
  enabled: number          // 0 or 1
}

export function createNotificationTables(): void {
  const db = getDatabase()

  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id           TEXT PRIMARY KEY,
      business_id  TEXT NOT NULL DEFAULT 'local',
      user_id      TEXT NOT NULL,
      event_type   TEXT NOT NULL,
      payload      TEXT NOT NULL DEFAULT '{}',
      priority     TEXT NOT NULL DEFAULT 'normal',
      created_at   TEXT NOT NULL,
      read_at      TEXT
    )
  `)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_notif_user_created ON notifications(user_id, created_at DESC)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_notif_user_read ON notifications(user_id, read_at)`)

  db.exec(`
    CREATE TABLE IF NOT EXISTS notification_preferences (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL,
      event_type  TEXT NOT NULL DEFAULT '*',
      channel     TEXT NOT NULL DEFAULT 'in_app',
      enabled     INTEGER NOT NULL DEFAULT 1,
      UNIQUE(user_id, event_type, channel)
    )
  `)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_notif_pref_user ON notification_preferences(user_id)`)

  log.info('Notification tables created')
}

// Inject logger without circular import
import log from 'electron-log'
