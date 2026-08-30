import type { DiscoveryAdvert } from './types'
import { getSyncStore } from '../services/store'

export type SyncMode = 'host' | 'client' | 'offline'
export type SyncStatus = 'online' | 'syncing' | 'offline'

export function dispatchSyncStatus(status: SyncStatus): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('soostori:app:syncStatus', { detail: { status } }))
  }
}

export function getLastProcessedSeq(): number {
  try {
    return (getSyncStore().get('lastProcessedSeq') as number) ?? 0
  } catch { return 0 }
}
