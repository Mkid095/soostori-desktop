import { contextBridge, ipcRenderer } from 'electron'
import { dbHandlers } from './handlers-db'
import { hwHandlers, appHandlers } from './handlers-hw-app'
import { updaterHandlers } from './handlers-hw-app'
import { exposeAuthHandlers } from './handlers-auth'
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
  pullProducts: () => ipcRenderer.invoke('cloud:pullProducts'),
  pullCategories: () => ipcRenderer.invoke('cloud:pullCategories'),
  pullCustomers: () => ipcRenderer.invoke('cloud:pullCustomers'),
  pullAll: () => ipcRenderer.invoke('cloud:pullAll'),
  pullCommissions: (salespersonProfileId: string) => ipcRenderer.invoke('cloud:pullCommissions', salespersonProfileId),
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
  // Register SDK auth as window.cloudAuthSdk (separate from old magic-code cloudAuth)
  exposeAuthHandlers()

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
    onSyncStatusChange: (callback: (mode: 'host' | 'client' | 'offline') => void) => {
      const handler = (_event: Electron.IpcRendererEvent, mode: 'host' | 'client' | 'offline') => {
        window.dispatchEvent(new CustomEvent('soostori:app:syncStatus', { detail: mode === 'offline' ? 'offline' : 'online' }))
        callback(mode)
      }
      ipcRenderer.on('sync:statusChange', handler)
      return () => ipcRenderer.removeListener('sync:statusChange', handler)
    },
    onSaleCompleted: (callback: (data: { saleId: string; total: number }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { saleId: string; total: number }) => {
        window.dispatchEvent(new CustomEvent('soostori:sale-completed', { detail: data }))
        callback(data)
      }
      ipcRenderer.on('notification:sale-completed', handler)
      return () => ipcRenderer.removeListener('notification:sale-completed', handler)
    },
    // @soostori/notifications engine — in-app channel dispatches here
    onNotification: (callback: (data: {
      id: string; title: string; body: string; priority: string
      data?: Record<string, unknown>; timestamp: number; read: boolean
    }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: {
        id: string; title: string; body: string; priority: string
        data?: Record<string, unknown>; timestamp: number; read: boolean
      }) => {
        window.dispatchEvent(new CustomEvent('soostori:notification', { detail: data }))
        callback(data)
      }
      ipcRenderer.on('notification:rendered', handler)
      return () => ipcRenderer.removeListener('notification:rendered', handler)
    },
    // Tray → renderer: user clicked an OS notification
    onNotificationClicked: (callback: (data: { id: string; eventType: string; data?: Record<string, unknown> }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { id: string; eventType: string; data?: Record<string, unknown> }) => {
        window.dispatchEvent(new CustomEvent('soostori:notification-clicked', { detail: data }))
        callback(data)
      }
      ipcRenderer.on('notification:clicked', handler)
      return () => ipcRenderer.removeListener('notification:clicked', handler)
    },
    // Tray → renderer: open notifications panel
    onOpenNotifications: (callback: () => void) => {
      const handler = () => {
        window.dispatchEvent(new CustomEvent('soostori:open-notifications'))
        callback()
      }
      ipcRenderer.on('notification:openNotifications', handler)
      return () => ipcRenderer.removeListener('notification:openNotifications', handler)
    },
    // Tray → renderer: mark all read
    onMarkAllNotificationsRead: (callback: () => void) => {
      const handler = () => {
        window.dispatchEvent(new CustomEvent('soostori:mark-all-notifications-read'))
        callback()
      }
      ipcRenderer.on('notification:markAllRead', handler)
      return () => ipcRenderer.removeListener('notification:markAllRead', handler)
    },
    cloudAuthSdk: null,
  } as ElectronAPI)
}
