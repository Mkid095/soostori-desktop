import React from 'react'
import { Bell, Check, CircleAlert, CloudOff, Download, Info, Trash2, Wifi, X } from 'lucide-react'
import { useNotifications, type NotificationKind } from '../../hooks/useNotifications'
import { useTranslation } from '../../lib/useTranslation'

const iconFor = (kind: NotificationKind) => {
  if (kind === 'offline') return <CloudOff size={16} className="text-amber-500 shrink-0" />
  if (kind === 'online') return <Wifi size={16} className="text-emerald-500 shrink-0" />
  if (kind === 'update_available') return <Download size={16} className="text-blue-500 shrink-0" />
  if (kind === 'low_stock') return <CircleAlert size={16} className="text-red-500 shrink-0" />
  return <Info size={16} className="text-slate-400 shrink-0" />
}

const labelFor = (kind: NotificationKind, t: (k: string) => string) => {
  if (kind === 'offline') return t('not.offline')
  if (kind === 'online') return t('not.online')
  if (kind === 'update_available') return t('not.updateAvailable')
  if (kind === 'low_stock') return t('not.lowStock')
  if (kind === 'sync_complete') return t('not.syncComplete')
  return t('not.notification')
}

const NotificationsPage: React.FC = () => {
  const { t } = useTranslation()
  const { notifications, dismiss, markAllRead, clearAll, unreadCount } = useNotifications()

  const formatDate = (ts: number) => {
    const d = new Date(ts)
    return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) + ' ' +
      d.toLocaleTimeString('en-KE', { hour: 'numeric', minute: '2-digit' })
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg-primary">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-bg-secondary px-4 py-3 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-orange text-white">
            <Bell size={14} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100">{t('not.notifications')}</h1>
            <p className="text-[10px] text-slate-400">{unreadCount > 0 ? `${unreadCount} unread` : t('not.allCaughtUp')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
              <Check size={12} />{t('not.markAllRead')}
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={clearAll} className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60">
              <Trash2 size={12} />{t('not.clearAll')}
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <Bell size={28} className="text-slate-300 dark:text-slate-600" />
            </div>
            <p className="text-sm font-bold text-slate-400">{t('not.noNotifications')}</p>
            <p className="text-xs text-slate-400">{t('not.noNotificationsHint')}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.map((n) => (
              <div key={n.id} className={`flex gap-3 px-4 py-4 ${n.read ? 'opacity-60' : ''}`}>
                <div className="mt-0.5">{iconFor(n.kind)}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{n.message || labelFor(n.kind, t)}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{formatDate(n.timestamp)}</p>
                </div>
                <button
                  onClick={() => dismiss(n.id)}
                  aria-label={t('action.dismiss')}
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500 dark:hover:bg-slate-800"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default NotificationsPage
