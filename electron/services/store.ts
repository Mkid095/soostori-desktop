import ElectronStore from 'electron-store'

interface SyncStoreSchema {
  lastProcessedSeq: number
  hostDeviceId: string
  hostUrl: string
  cloudSession: string  // JSON-serialized CloudSession
  cloudDeviceId: string
  deviceId: string      // local device UUID
  shopId: string
  employeeId: string
  firstLaunchAt: string
  subscription: string  // JSON-serialized cloud subscription state
  subscriptionCheckedAt: string
  subscriptionLastSuccess: string
}

let syncStore: ElectronStore<SyncStoreSchema> | null = null

export function getSyncStore(): ElectronStore<SyncStoreSchema> {
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
  }
  return syncStore
}
