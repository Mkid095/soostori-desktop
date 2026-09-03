import { contextBridge, ipcRenderer } from 'electron'
import { dbHandlers } from './handlers-db'
import { hwHandlers, appHandlers } from './handlers-hw-app'
import { updaterHandlers } from './handlers-hw-app'
import type { ElectronAPI } from './types'

const cloudHandlers: ElectronAPI['cloud'] = {
  syncEvents: () => ipcRenderer.invoke('cloud:syncEvents'),
  syncShopSettings: () => ipcRenderer.invoke('cloud:syncShopSettings'),
  pullShopSettings: () => ipcRenderer.invoke('cloud:pullShopSettings'),
  heartbeat: (deviceId: string) => ipcRenderer.invoke('cloud:heartbeat', deviceId),
  subscription: () => ipcRenderer.invoke('cloud:subscription'),
  fullSync: () => ipcRenderer.invoke('cloud:fullSync'),
  health: () => ipcRenderer.invoke('cloud:health'),
}

export function exposeElectronAPI(): void {
  contextBridge.exposeInMainWorld('electronAPI', {
    db: dbHandlers,
    hw: hwHandlers,
    app: appHandlers,
    updater: updaterHandlers,
    cloud: cloudHandlers,
    onLowStockNotification: (callback: (data: { productName: string; stock: number }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { productName: string; stock: number }) => {
        window.dispatchEvent(new CustomEvent('soostori:low-stock', { detail: data }))
        callback(data)
      }
      ipcRenderer.on('notification:low-stock', handler)
      return () => ipcRenderer.removeListener('notification:low-stock', handler)
    },
  } as ElectronAPI)
}
