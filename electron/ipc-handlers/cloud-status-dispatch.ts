/**
 * cloud-status-dispatch.ts — Shared cloud status dispatcher.
 * Used by both connectivity and data handlers.
 */

import { getMainWindow } from '../window-manager'
import log from 'electron-log'

export type CloudStatus = 'online' | 'syncing' | 'offline'

let _lastStatus: CloudStatus = 'offline'

export function dispatchCloudStatus(status: CloudStatus): void {
  const win = getMainWindow()
  if (win) win.webContents.send('cloud:status', status)
  try {
    const { dispatchSyncStatus } = require('../sync/sync-service-core')
    dispatchSyncStatus(status === 'online' ? 'online' : status === 'syncing' ? 'syncing' : 'offline')
  } catch { /* core not available */ }
  if (status !== _lastStatus) {
    _lastStatus = status
    if (status === 'online') import('../services/queue-replay').then(m => m.notifyOnline()).catch(() => {})
    else if (status === 'offline') import('../services/queue-replay').then(m => m.notifyOffline()).catch(() => {})
  }
}
