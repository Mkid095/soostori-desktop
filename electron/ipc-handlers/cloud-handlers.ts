/**
 * cloud-handlers.ts — IPC handlers for cloud sync operations.
 * Renderer calls these to trigger sync actions and read cloud state.
 */

import { ipcMain } from 'electron'
import * as cloudSync from '../services/cloud-sync'
import { getMainWindow } from '../window-manager'
import log from 'electron-log'

type CloudStatus = 'online' | 'syncing' | 'offline'

function dispatchCloudStatus(status: CloudStatus): void {
  // Dispatch both DOM events so existing SyncIndicator listens to them
  const win = getMainWindow()
  if (win) {
    win.webContents.send('cloud:status', status)
  }
  try {
    const { dispatchSyncStatus } = require('../sync/sync-service-core')
    dispatchSyncStatus(status === 'online' ? 'online' : status === 'syncing' ? 'syncing' : 'offline')
  } catch { /* core not available */ }
}

export function registerCloudHandlers(): void {
  // Push pending sync events to cloud
  ipcMain.handle('cloud:syncEvents', async () => {
    const appId = process.env.INSTANT_APP_ID
    if (!appId) return { pushed: 0 }
    dispatchCloudStatus('syncing')
    try {
      const count = await cloudSync.pushSyncEvents()
      dispatchCloudStatus('online')
      log.info(`cloud:syncEvents pushed ${count}`)
      return { pushed: count }
    } catch (err) {
      dispatchCloudStatus('offline')
      log.warn('cloud:syncEvents failed', err)
      return { pushed: 0 }
    }
  })

  // Push shop settings to cloud
  ipcMain.handle('cloud:syncShopSettings', async () => {
    dispatchCloudStatus('syncing')
    try {
      await cloudSync.pushShopSettings()
      dispatchCloudStatus('online')
      return { success: true }
    } catch (err) {
      dispatchCloudStatus('offline')
      log.warn('cloud:syncShopSettings failed', err)
      return { success: false, error: String(err) }
    }
  })

  // Pull shop settings from cloud (cloud-wins for settings)
  ipcMain.handle('cloud:pullShopSettings', async () => {
    dispatchCloudStatus('syncing')
    try {
      const ok = await cloudSync.pullShopSettings()
      dispatchCloudStatus('online')
      return { success: ok }
    } catch (err) {
      dispatchCloudStatus('offline')
      log.warn('cloud:pullShopSettings failed', err)
      return { success: false, error: String(err) }
    }
  })

  // Push device heartbeat
  ipcMain.handle('cloud:heartbeat', (_event, deviceId: string) => {
    cloudSync.pushDeviceHeartbeat(deviceId).catch(() => {})
    return { success: true }
  })

  // Check cloud subscription / plan info
  ipcMain.handle('cloud:subscription', async () => {
    try {
      const sub = await cloudSync.checkCloudSubscription()
      return sub
    } catch (err) {
      log.warn('cloud:subscription failed', err)
      return { valid: true, plan: null, deviceLimit: null, expiryDate: null }
    }
  })

  // Full snapshot sync
  ipcMain.handle('cloud:fullSync', async () => {
    dispatchCloudStatus('syncing')
    try {
      await cloudSync.pushFullSnapshot()
      dispatchCloudStatus('online')
      return { success: true }
    } catch (err) {
      dispatchCloudStatus('offline')
      log.warn('cloud:fullSync failed', err)
      return { success: false, error: String(err) }
    }
  })

  // Cloud connectivity check
  ipcMain.handle('cloud:health', async () => {
    try {
      const appId = process.env.INSTANT_APP_ID
      if (!appId) return { reachable: false }
      const t0 = Date.now()
      const res = await fetch(`${process.env.INSTANT_API_URI}/api/v1/apps/${appId}`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      })
      dispatchCloudStatus(res.ok ? 'online' : 'offline')
      return { reachable: res.ok, latencyMs: Date.now() - t0 }
    } catch {
      dispatchCloudStatus('offline')
      return { reachable: false, latencyMs: null }
    }
  })

  // Manual reconnect — triggers a full sync attempt
  ipcMain.handle('cloud:reconnect', async () => {
    try {
      const appId = process.env.INSTANT_APP_ID
      if (!appId) return { ok: false }
      const t0 = Date.now()
      const res = await fetch(`${process.env.INSTANT_API_URI}/api/v1/apps/${appId}`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) return { ok: false }
      dispatchCloudStatus('syncing')
      await cloudSync.pushSyncEvents()
      await cloudSync.pushShopSettings()
      dispatchCloudStatus('online')
      return { ok: true }
    } catch (err) {
      dispatchCloudStatus('offline')
      log.warn('cloud:reconnect failed', err)
      return { ok: false }
    }
  })

  log.info('Cloud IPC handlers registered')
}
