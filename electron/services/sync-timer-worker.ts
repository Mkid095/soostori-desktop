/**
 * sync-timer-worker.ts — 30-second cloud sync polling worker.
 *
 * Phase 05: runs every 30 seconds when online, calls pull() and applies
 * incoming events to local SQLite.
 */

import log from 'electron-log'
import { CloudClient } from '@soostori/cloud'
import { getRealSyncEngine } from '../sync/sync-engine'
import { resolveActiveShopId } from '../database/active-shop'
import { getSyncStore } from '../services/store'
import { dispatchSyncStatus } from '../sync/sync-service-core'
import type { SyncEvent, SyncCursor } from '@soostori/contracts'
import { asDeviceId, asBusinessId, type SyncCursorId } from '@soostori/core'

const APP_ID = process.env.INSTANT_APP_ID || ''
const SYNC_INTERVAL_MS = 30_000

let _timer: ReturnType<typeof setInterval> | null = null
let _lastSyncAt: string | null = null

function isOnline(): boolean {
  return (
    getSyncStore().get('cloudToken') != null &&
    APP_ID !== '' &&
    !getSyncStore().get('isOfflineMode')
  )
}

async function runCloudPull(): Promise<void> {
  if (!isOnline()) return

  try {
    const shopId = await resolveActiveShopId()
    const token = getSyncStore().get('cloudToken') as string | undefined
    const cloud = new CloudClient({ appId: APP_ID, token })

    const engine = getRealSyncEngine()
    engine.setCloudClient(cloud)

    const cursor: SyncCursor = {
      cursorId: `cursor-${shopId}` as SyncCursorId,
      deviceId: asDeviceId(getSyncStore().get('deviceId') as string || 'local'),
      businessId: asBusinessId(shopId),
      lastServerReceivedAt: _lastSyncAt ?? null,
      lastOriginatingDeviceId: null,
      lastClientSequence: null,
      lastSyncAt: new Date().toISOString(),
    }

    dispatchSyncStatus('syncing')
    const events: SyncEvent[] = await engine.pull(cursor)

    if (events.length > 0) {
      for (const event of events) {
        await engine.apply(null, event)
      }
      log.info(`SyncTimerWorker: applied ${events.length} events`)
    }

    _lastSyncAt = new Date().toISOString()
    dispatchSyncStatus('online')
  } catch (err) {
    log.warn('SyncTimerWorker: pull cycle failed', err)
    dispatchSyncStatus('online')
  }
}

export function startSyncTimerWorker(): void {
  if (_timer) return
  if (!APP_ID) {
    log.info('SyncTimerWorker: no INSTANT_APP_ID, skipping')
    return
  }

  log.info('SyncTimerWorker: starting (30s interval)')
  runCloudPull().catch(() => {})

  _timer = setInterval(() => {
    if (isOnline()) {
      runCloudPull().catch(() => {})
    }
  }, SYNC_INTERVAL_MS)
}

export function stopSyncTimerWorker(): void {
  if (_timer) {
    clearInterval(_timer)
    _timer = null
    log.info('SyncTimerWorker: stopped')
  }
}
