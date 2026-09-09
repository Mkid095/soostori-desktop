/**
 * cloud-connectivity-handlers.ts — Cloud connectivity & health IPC handlers.
 * Part of cloud-handlers split per ANPAS (≤150 lines per file).
 */

import { ipcMain } from 'electron'
import * as cloudSync from '../services/cloud-sync'
import { dispatchCloudStatus } from './cloud-status-dispatch'
import log from 'electron-log'

export function registerCloudConnectivityHandlers(): void {
  ipcMain.handle('cloud:health', async () => {
    try {
      const appId = process.env.INSTANT_APP_ID
      if (!appId) return { reachable: false }
      const t0 = Date.now()
      const res = await fetch(`${process.env.INSTANT_API_URI}/api/v1/apps/${appId}`, {
        method: 'GET', signal: AbortSignal.timeout(5000),
      })
      dispatchCloudStatus(res.ok ? 'online' : 'offline')
      return { reachable: res.ok, latencyMs: Date.now() - t0 }
    } catch {
      dispatchCloudStatus('offline')
      return { reachable: false, latencyMs: null }
    }
  })

  ipcMain.handle('cloud:reconnect', async () => {
    try {
      const appId = process.env.INSTANT_APP_ID
      if (!appId) return { ok: false }
      const res = await fetch(`${process.env.INSTANT_API_URI}/api/v1/apps/${appId}`, {
        method: 'GET', signal: AbortSignal.timeout(5000),
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

  ipcMain.handle('cloud:heartbeat', (_event, deviceId: string) => {
    cloudSync.pushDeviceHeartbeat(deviceId).catch(() => {})
    return { success: true }
  })

  ipcMain.handle('cloud:subscription', async () => {
    try {
      return await cloudSync.checkCloudSubscription()
    } catch (err) {
      log.warn('cloud:subscription failed', err)
      return { valid: true, plan: null, deviceLimit: null, expiryDate: null }
    }
  })

  log.info('Cloud connectivity IPC handlers registered')
}
