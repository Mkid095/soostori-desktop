import ElectronStore from 'electron-store'
import { randomUUID } from 'crypto'

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
