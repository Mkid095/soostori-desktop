import React, { useEffect, useState } from 'react'
import { AlertCircle, CloudOff, Clock3, RefreshCw, AlertTriangle } from 'lucide-react'
import { useNetworkStatus } from '../lib/network-status'
import { useTranslation } from '../lib/useTranslation'

export type SyncState = 'idle' | 'syncing' | 'error'
export type BannerPhase = 'online' | 'offline_warning' | 'offline_limit_exceeded' | 'subscription_blocked' | null
const SYNC_STATUS_EVENT = 'soostori:app:syncStatus'

type SyncStatusEvent = CustomEvent<{ status: SyncState | 'offline' | 'complete' }>

/** Compact sync status control + offline/subscription banner. Listens for soostori:app:syncStatus DOM events from sync service. */
const SyncIndicator: React.FC = () => {
  const { t } = useTranslation()
  const { isOnline } = useNetworkStatus()
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const [banner, setBanner] = useState<BannerPhase>(null)
  const state = isOnline ? syncState : 'offline'

  const stateMeta = {
    idle: { label: t('app.synced'), icon: Clock3, className: 'text-slate-500' },
    syncing: { label: t('app.syncing'), icon: RefreshCw, className: 'text-blue-600' },
    offline: { label: t('app.offline'), icon: CloudOff, className: 'text-amber-600' },
    error: { label: t('app.syncError'), icon: AlertCircle, className: 'text-red-600' },
  } as const

  const meta = stateMeta[state]
  const Icon = meta.icon

  useEffect(() => {
    const handleSyncStatus = (event: Event) => {
      const detail = (event as SyncStatusEvent).detail
      if (detail.status === 'offline') setSyncState('idle')
      else if (detail.status === 'complete' || detail.status === 'idle') setSyncState('idle')
      else setSyncState(detail.status)
    }

    const handleOfflineWarning = (event: Event) => {
      const days = (event as CustomEvent).detail?.daysOffline ?? 3
      setBanner('offline_warning')
    }
    const handleOfflineLimitExceeded = () => setBanner('offline_limit_exceeded')
    const handleSubscriptionBlocked = () => setBanner('subscription_blocked')

    window.addEventListener(SYNC_STATUS_EVENT, handleSyncStatus)
    window.addEventListener('soostori:offline:warning', handleOfflineWarning)
    window.addEventListener('soostori:offline:limit_exceeded', handleOfflineLimitExceeded)
    window.addEventListener('soostori:subscription:blocked', handleSubscriptionBlocked)

    return () => {
      window.removeEventListener(SYNC_STATUS_EVENT, handleSyncStatus)
      window.removeEventListener('soostori:offline:warning', handleOfflineWarning)
      window.removeEventListener('soostori:offline:limit_exceeded', handleOfflineLimitExceeded)
      window.removeEventListener('soostori:subscription:blocked', handleSubscriptionBlocked)
    }
  }, [])

  // Clear banner when back online
  useEffect(() => {
    if (isOnline && banner) {
      setBanner(null)
    }
  }, [isOnline])

  const requestSync = () => {
    if (!isOnline) return
    window.dispatchEvent(new Event('soostori-sync-request'))
  }

  return (
    <>
      {/* Offline/subscription banner */}
      {banner === 'offline_warning' && (
        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 px-4 py-1.5">
          <AlertTriangle size={13} className="text-amber-600 shrink-0" />
          <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
            Offline day 3 — connection required soon
          </span>
        </div>
      )}
      {banner === 'offline_limit_exceeded' && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/40 border-b border-red-200 dark:border-red-800 px-4 py-1.5">
          <AlertCircle size={13} className="text-red-600 shrink-0" />
          <span className="text-[11px] font-semibold text-red-700 dark:text-red-300">
            Offline limit reached — connection required to continue
          </span>
        </div>
      )}
      {banner === 'subscription_blocked' && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/40 border-b border-red-200 dark:border-red-800 px-4 py-1.5">
          <AlertCircle size={13} className="text-red-600 shrink-0" />
          <span className="text-[11px] font-semibold text-red-700 dark:text-red-300">
            Subscription blocked — cloud connection required
          </span>
        </div>
      )}
      <button
        type="button"
        onClick={requestSync}
        disabled={!isOnline || state === 'syncing'}
        aria-label={`${t('app.sync')}: ${meta.label}`}
        title={isOnline ? t('app.syncLocalChanges') : t('app.reconnectToSync')}
        className={`flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-bold transition-all duration-200 hover:bg-slate-100 disabled:cursor-default disabled:hover:bg-transparent ${meta.className}`}
      >
        <Icon size={13} className={state === 'syncing' ? 'animate-spin' : ''} strokeWidth={2.25} />
        <span className="whitespace-nowrap">{meta.label}</span>
      </button>
    </>
  )
}

export default SyncIndicator
