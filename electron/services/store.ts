import ElectronStore from 'electron-store'

interface SyncStoreSchema {
  lastProcessedSeq: number
  hostDeviceId: string
  hostUrl: string
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
      },
    })
  }
  return syncStore
}
