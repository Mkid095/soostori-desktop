/**
 * sync-ipc-handlers.ts — Cloud sync IPC handlers for db:sync:pull + db:sync:apply.
 *
 * Phase 05: real sync engine wired to FIDScript cloud.
 * These handlers call the real sync engine (RealSyncEngine) which uses
 * CloudClient to communicate with the FIDScript cloud.
 */

import { ipcMain } from 'electron'
import log from 'electron-log'
import { CloudClient } from '@soostori/cloud'
import { getRealSyncEngine } from '../sync/sync-engine'
import { resolveActiveShopId } from '../database/active-shop'
import { getSyncStore } from '../services/store'
import type { SyncEvent, SyncCursor } from '@soostori/contracts'
import { asDeviceId, asBusinessId, type SyncCursorId } from '@soostori/core'

const APP_ID = process.env.INSTANT_APP_ID || ''

async function buildCursor(): Promise<SyncCursor> {
  const shopId = await resolveActiveShopId()
  const deviceId = getSyncStore().get('deviceId') as string || 'local'
  return {
    cursorId: `cursor-${shopId}` as SyncCursorId,
    deviceId: asDeviceId(deviceId),
    businessId: asBusinessId(shopId),
    lastServerReceivedAt: null,
    lastOriginatingDeviceId: null,
    lastClientSequence: null,
    lastSyncAt: new Date().toISOString(),
  }
}

export function registerSyncIpcHandlers(): void {
  /**
   * db:sync:pull — pull events from cloud since cursor.
   * Returns array of SyncEvent.
   */
  ipcMain.handle('db:sync:pull', async (_event, since?: string) => {
    if (!APP_ID) {
      log.warn('db:sync:pull: no INSTANT_APP_ID')
      return []
    }
    try {
      const cursor = await buildCursor()
      if (since) cursor.lastSyncAt = since

      const token = getSyncStore().get('cloudToken') as string | undefined
      const cloud = new CloudClient({ appId: APP_ID, token })

      const engine = getRealSyncEngine()
      engine.setCloudClient(cloud)

      const events = await engine.pull(cursor)
      log.info(`db:sync:pull: fetched ${events.length} events`)
      return events
    } catch (err) {
      log.warn('db:sync:pull failed', err)
      return []
    }
  })

  /**
   * db:sync:apply — apply an array of SyncEvents to local SQLite.
   * Returns array of apply results.
   */
  ipcMain.handle('db:sync:apply', async (_event, rawEvents: unknown) => {
    const events = rawEvents as SyncEvent[]
    if (!Array.isArray(events)) {
      log.warn('db:sync:apply: expected array')
      return []
    }
    const results: Array<{ idempotencyKey: string; state: string }> = []
    const engine = getRealSyncEngine()

    for (const event of events) {
      try {
        const result = await engine.apply(null, event)
        results.push({ idempotencyKey: event.idempotencyKey, state: result.state })
        log.debug(`db:sync:apply: ${event.idempotencyKey} → ${result.state}`)
      } catch (err) {
        log.warn(`db:sync:apply: failed for ${event.idempotencyKey}`, err)
        results.push({ idempotencyKey: event.idempotencyKey, state: 'error' })
      }
    }
    log.info(`db:sync:apply: applied ${results.length} events`)
    return results
  })

  log.info('Sync IPC handlers (pull/apply) registered')
}
