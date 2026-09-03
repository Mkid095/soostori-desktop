/**
 * sync-task-service.ts — Background task runner for cloud sync operations.
 * Runs in the Electron main process.
 */

import { getSyncStore } from './store'
import * as cloudSync from './cloud-sync'
import { pushDeviceHeartbeat } from './cloud-sync'
import log from 'electron-log'

let _timer: ReturnType<typeof setInterval> | null = null
let _deviceId = ''

export function configureSyncTaskService(deviceId: string): void {
  _deviceId = deviceId
}

export function startSyncTaskService(): void {
  if (_timer) return
  // Initial sync attempt on start
  runSyncCycle().catch(() => {})
  // Then every 2 minutes
  _timer = setInterval(() => { runSyncCycle().catch(() => {}) }, 2 * 60 * 1000)
  log.info('SyncTaskService: started')
}

export function stopSyncTaskService(): void {
  if (_timer) { clearInterval(_timer); _timer = null }
  log.info('SyncTaskService: stopped')
}

async function runSyncCycle(): Promise<void> {
  const appId = process.env.INSTANT_APP_ID
  if (!appId) return

  try {
    // 1. Push any unsynced events
    const pushed = await cloudSync.pushSyncEvents()
    // 2. Push shop settings
    await cloudSync.pushShopSettings()
    // 3. Push heartbeat
    if (_deviceId) await pushDeviceHeartbeat(_deviceId)
    // 4. Pull shop settings (cloud-wins for settings)
    await cloudSync.pullShopSettings()
    log.debug(`SyncTaskService: cycle complete (${pushed} events pushed)`)
  } catch (err) {
    log.warn('SyncTaskService: cycle failed', err)
  }
}
