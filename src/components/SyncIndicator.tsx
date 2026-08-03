import React, { useEffect, useState } from 'react'
import { AlertCircle, CloudOff, Clock3, RefreshCw } from 'lucide-react'
import { useNetworkStatus } from '../lib/network-status'
import { useTranslation } from '../lib/useTranslation'

export type SyncState = 'idle' | 'syncing' | 'error'
const SYNC_STATUS_EVENT = 'soostori-sync-status'

type SyncStatusEvent = CustomEvent<SyncState | 'offline' | 'complete'>

/** Compact sync status control. Sync services can publish soostori-sync-status events. */
const SyncIndicator: React.FC = () => {
  const { t } = useTranslation()
  const { isOnline } = useNetworkStatus()
  const [syncState, setSyncState] = useState<SyncState>('idle')
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
      if (detail === 'offline') setSyncState('idle')
      else if (detail === 'complete' || detail === 'idle') setSyncState('idle')
      else setSyncState(detail)
    }
    window.addEventListener(SYNC_STATUS_EVENT, handleSyncStatus)
    return () => window.removeEventListener(SYNC_STATUS_EVENT, handleSyncStatus)
  }, [])

  const requestSync = () => {
    if (!isOnline) return
    window.dispatchEvent(new Event('soostori-sync-request'))
  }

  return (
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
  )
}

export default SyncIndicator
