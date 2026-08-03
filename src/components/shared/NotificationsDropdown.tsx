import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, Check, CircleAlert, CloudOff, Download, Info, Wifi, X } from 'lucide-react'
import type { UpdateStatusData } from '../../lib/types/api'
import { useTranslation } from '../../lib/useTranslation'

type NotificationKind = 'update_available' | 'sync_complete' | 'offline' | 'online' | 'low_stock'
interface NotificationItem { id: string; kind: NotificationKind; messageKey?: string; message?: string; timestamp: Date; read: boolean; version?: string }

const notificationIcon = (kind: NotificationKind) => {
  if (kind === 'offline') return <CloudOff size={14} className="text-amber-500" />
  if (kind === 'online') return <Wifi size={14} className="text-emerald-500" />
  if (kind === 'update_available') return <Download size={14} className="text-blue-500" />
  if (kind === 'low_stock') return <CircleAlert size={14} className="text-red-500" />
  return <Info size={14} className="text-slate-500" />
}

const NotificationsDropdown: React.FC = () => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  const addNotification = useCallback((kind: NotificationKind, message?: string, version?: string) => {
    const messageKey = kind
    setItems((current) => [{ id: `${kind}-${Date.now()}`, kind, messageKey, message, version, timestamp: new Date(), read: false }, ...current].slice(0, 5))
  }, [])

  useEffect(() => {
    const handleOnline = () => addNotification('online')
    const handleOffline = () => addNotification('offline')
    const handleSync = () => addNotification('sync_complete')
    const handleUpdate = (data: UpdateStatusData) => {
      if (data.status === 'available') addNotification('update_available', `Version ${data.version || 'new'} is available.`, data.version)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('soostori-sync-complete', handleSync)
    const unsubscribe = window.electronAPI?.updater?.onStatus(handleUpdate)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('soostori-sync-complete', handleSync)
      unsubscribe?.()
    }
  }, [addNotification])

  useEffect(() => {
    if (!isOpen) return
    const closeOnOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setIsOpen(false) }
    document.addEventListener('mousedown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => { document.removeEventListener('mousedown', closeOnOutside); document.removeEventListener('keydown', closeOnEscape) }
  }, [isOpen])

  const getMessage = (item: NotificationItem) => {
    if (item.message) return item.message
    if (item.kind === 'online') return t('app.connectionRestored')
    if (item.kind === 'offline') return t('app.offline')
    if (item.kind === 'sync_complete') return t('app.localChangesSynced')
    if (item.kind === 'update_available' && item.version) return `${t('app.versionAvailable')} ${item.version}`
    return ''
  }

  const unreadCount = items.filter((item) => !item.read).length
  const dismiss = (id: string) => setItems((current) => current.filter((item) => item.id !== id))
  const markAllRead = () => setItems((current) => current.map((item) => ({ ...item, read: true })))
  const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  return (
    <div ref={containerRef} className="relative">
      <button type="button" onClick={() => setIsOpen((open) => !open)} aria-expanded={isOpen} aria-haspopup="true" aria-label={`${t('app.notifications')}${unreadCount ? `, ${unreadCount} unread` : ''}`} className="relative flex h-7 items-center gap-1.5 rounded-full px-2.5 text-slate-500 transition-all duration-200 hover:bg-orange-50 hover:text-brand-orange">
        <Bell size={14} />
        {unreadCount > 0 && <span className="absolute right-1 top-0 h-1.5 w-1.5 rounded-full bg-brand-orange" aria-hidden="true" />}
        <span className="text-[10px] font-bold">{t('app.notifications')}</span>
      </button>
      {isOpen && (
        <section role="dialog" aria-label={t('app.notifications')} className="absolute right-0 top-9 z-[10000] w-80 overflow-hidden rounded-xl border border-slate-200 bg-white/95 shadow-xl backdrop-blur-md animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
            <h2 className="text-xs font-black text-slate-800">{t('app.notifications')}</h2>
            <button type="button" onClick={markAllRead} disabled={unreadCount === 0} className="text-[10px] font-bold text-brand-orange transition-colors hover:text-orange-700 disabled:text-slate-300">{t('app.markAllRead')}</button>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {items.length === 0 ? <div className="flex flex-col items-center gap-1.5 px-4 py-8 text-center text-slate-400"><Check size={24} className="text-emerald-500" /><p className="text-xs font-bold">{t('app.allCaughtUp')}</p><p className="text-[10px]">{t('app.newActivityAppear')}</p></div> : items.map((item) => (
              <div key={item.id} className={`flex gap-2.5 border-b border-slate-100 px-3 py-2.5 last:border-0 ${item.read ? '' : 'bg-orange-50/40'}`}>
                <div className="mt-0.5 shrink-0">{notificationIcon(item.kind)}</div>
                <div className="min-w-0 flex-1"><p className="text-[11px] font-semibold leading-snug text-slate-700">{getMessage(item)}</p><time className="mt-1 block text-[10px] text-slate-400">{formatTime(item.timestamp)}</time></div>
                <button type="button" onClick={() => dismiss(item.id)} aria-label={t('app.dismissNotification')} className="h-5 w-5 shrink-0 rounded text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500"><X size={12} /></button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default NotificationsDropdown
