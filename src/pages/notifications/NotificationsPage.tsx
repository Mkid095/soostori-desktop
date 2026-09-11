/**
 * NotificationsPage.tsx — Phase 17 SQLite-backed notifications page.
 *
 * Uses IPC (notifications:list / notifications:markRead / notifications:markAllRead)
 * instead of localStorage. Shows all notification types with event-type icons,
 * unread badge, mark-read, filter by type, and unread count.
 */

import React, { useCallback, useEffect, useState } from 'react'
import { Bell, Check, Trash2, Filter, CircleAlert } from 'lucide-react'
import { useTranslation } from '../../lib/useTranslation'
import NotificationItem from '../../components/notifications/NotificationItem'
import type { NotificationRecord } from '../../../electron/preload/ipc-signatures-db'

const EVENT_TYPES = [
  { value: '', label: 'All' },
  { value: 'sale.created', label: 'Sales' },
  { value: 'debt.payment_recorded', label: 'Debt' },
  { value: 'inventory.low_stock', label: 'Stock' },
  { value: 'team.member_added', label: 'Team' },
  { value: 'commission.created', label: 'Commission' },
  { value: 'expense.created', label: 'Expense' },
]

const NotificationsPage: React.FC = () => {
  const { t } = useTranslation()
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [total, setTotal] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await window.electronAPI.db.listNotifications({
        limit: 100,
        eventType: filter || undefined,
      })
      setNotifications(res.items)
      setTotal(res.total)
      const count = await window.electronAPI.db.getUnreadNotificationCount()
      setUnreadCount(count)
    } catch (err) {
      console.error('Failed to load notifications', err)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { load() }, [load])

  // Also reload when a sync event fires a notification
  useEffect(() => {
    const handler = () => { load() }
    window.addEventListener('soostori:notification', handler)
    return () => window.removeEventListener('soostori:notification', handler)
  }, [load])

  const handleMarkRead = async (id: string) => {
    await window.electronAPI.db.markNotificationRead(id)
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const handleDismiss = async (id: string) => {
    // Remove locally (no delete IPC — dismiss = mark read + archive)
    const n = notifications.find(n => n.id === id)
    if (n && !n.read_at) {
      await window.electronAPI.db.markNotificationRead(id)
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const handleMarkAllRead = async () => {
    await window.electronAPI.db.markAllNotificationsRead()
    setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })))
    setUnreadCount(0)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg-primary">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-bg-secondary px-4 py-3 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-brand-orange text-white">
            <Bell size={14} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100">{t('not.notifications')}</h1>
            <p className="text-[10px] text-slate-400">
              {unreadCount > 0 ? `${unreadCount} unread · ${total} total` : `${total} total`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <Check size={12} />{t('not.markAllRead')}
            </button>
          )}
        </div>
      </header>

      {/* Filter bar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 bg-bg-secondary px-4 py-2 dark:border-slate-700">
        <Filter size={12} className="text-slate-400 shrink-0" />
        <div className="flex gap-1 overflow-x-auto">
          {EVENT_TYPES.map(et => (
            <button
              key={et.value}
              onClick={() => setFilter(et.value)}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold transition-colors ${
                filter === et.value
                  ? 'bg-brand-orange text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
              }`}
            >
              {et.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-brand-orange" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <Bell size={28} className="text-slate-300 dark:text-slate-600" />
            </div>
            <p className="text-sm font-bold text-slate-400">{t('not.noNotifications')}</p>
            <p className="text-xs text-slate-400">{t('not.noNotificationsHint')}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.map(n => (
              <NotificationItem
                key={n.id}
                notification={n}
                onMarkRead={handleMarkRead}
                onDismiss={handleDismiss}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default NotificationsPage
