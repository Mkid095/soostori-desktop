import ElectronStore from 'electron-store'
import { randomUUID } from 'crypto'
import { setFirstLaunchFloorResolver } from './canonical/monotonic-clock'

interface SyncStoreSchema {
  lastProcessedSeq: number
  hostDeviceId: string
  hostUrl: string
  cloudSession: string  // JSON-serialized CloudSession
  cloudDeviceId: string
  deviceId: string      // canonical local device UUID (auto-generated)
  shopId: string
  employeeId: string
  firstLaunchAt: string
  subscription: string  // JSON-serialized cloud subscription state
  subscriptionCheckedAt: string
  subscriptionLastSuccess: string
  /** ISO timestamp when the offline grace first reached 0. Once set, the
   *  device stays blocked even after reconnect — grace does not reset. */
  offlineGraceExhaustedAt?: string | null
}

let syncStore: ElectronStore<SyncStoreSchema> | null = null

function getStore(): ElectronStore<SyncStoreSchema> {
  if (!syncStore) {
    syncStore = new ElectronStore<SyncStoreSchema>({
      name: 'sync-store',
      defaults: {
        lastProcessedSeq: 0,
        hostDeviceId: '',
        hostUrl: '',
        cloudSession: '',
        cloudDeviceId: '',
        deviceId: '',
        shopId: '',
        employeeId: '',
        firstLaunchAt: new Date().toISOString(),
        subscription: '',
        subscriptionCheckedAt: '',
        subscriptionLastSuccess: '',
      },
    })
    // Auto-generate device UUID on first launch
    if (!syncStore.get('deviceId')) {
      syncStore.set('deviceId', randomUUID())
    }
  }
  return syncStore
}

export { getStore as getSyncStore }

export function getOrCreateDeviceId(): string {
  const store = getStore()
  let id = store.get('deviceId')
  if (!id) {
    id = randomUUID()
    store.set('deviceId', id)
  }
  return id
}

/**
 * Register the first-launch floor resolver for monotonic-clock.ts.
 * Called on first `getSyncStore()` invocation — from then on, the
 * guard knows the persisted floor timestamp and can detect rollback.
 */
function ensureFloorResolverRegistered(): void {
  setFirstLaunchFloorResolver(() => {
    try {
      const raw = getStore().get('firstLaunchAt')
      if (typeof raw === 'string' && raw.length > 0) {
        const ms = new Date(raw).getTime()
        if (Number.isFinite(ms) && ms > 0) return ms
      }
      const now = Date.now()
      getStore().set('firstLaunchAt', new Date(now).toISOString())
      return now
    } catch {
      // Store unavailable (read-only, corrupt). Use now as fallback floor.
      return Date.now()
    }
  })
}

// Trigger resolver registration on module load (only runs once).
ensureFloorResolverRegistered()