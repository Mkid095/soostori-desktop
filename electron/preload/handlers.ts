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
  reconnect: () => ipcRenderer.invoke('cloud:reconnect'),
}

const cloudAuthHandlers: ElectronAPI['cloudAuth'] = {
  requestMagicCode: (email: string) => ipcRenderer.invoke('cloud:auth:requestMagicCode', email),
  verifyMagicCode: (email: string, code: string) => ipcRenderer.invoke('cloud:auth:verifyMagicCode', email, code),
  registerDevice: (data) => ipcRenderer.invoke('cloud:auth:registerDevice', data),
  getSession: () => ipcRenderer.invoke('cloud:auth:getSession'),
  logout: () => ipcRenderer.invoke('cloud:auth:logout'),
  syncEmployees: (shopId?: string) => ipcRenderer.invoke('cloud:auth:syncEmployees', shopId),
  subscription: (shopId?: string) => ipcRenderer.invoke('cloud:auth:subscription', shopId),
  restoreSession: () => ipcRenderer.invoke('cloud:auth:restoreSession'),
  createInvite: (data) => ipcRenderer.invoke('cloud:invites:create', data),
  acceptInvite: (data) => ipcRenderer.invoke('cloud:invites:accept', data),
  getEmployees: (shopId?: string) => ipcRenderer.invoke('cloud:auth:getEmployees', shopId),
}

export function exposeElectronAPI(): void {
  contextBridge.exposeInMainWorld('electronAPI', {
    db: dbHandlers,
    hw: hwHandlers,
    app: appHandlers,
    updater: updaterHandlers,
    cloud: cloudHandlers,
    cloudAuth: cloudAuthHandlers,
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
