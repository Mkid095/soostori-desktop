/**
 * sync-timer-worker.ts — 30-second cloud sync polling worker with Phase 16
 * offline-first: immediate drain on network-up, processedKeys dedup persistence.
 */

import log from 'electron-log'
import { CloudClient } from '@soostori/cloud'
import { getRealSyncEngine } from '../sync/sync-engine'
import { getDatabase } from '../database'
import { resolveActiveShopId } from '../database/active-shop'
import { getSyncStore } from '../services/store'
import { dispatchSyncStatus } from '../sync/sync-service-core'
import { setCloudOnline } from './cloud-sync-service'
import { notifyFromSyncEvent } from './desktop-notifications'
import { checkCloudSubscription } from './subscription-enforcer'
import { computeDesktopOfflineState } from './canonical/offline-state'
import type { SyncEvent, SyncCursor } from '@soostori/contracts'
import { asDeviceId, asBusinessId, type SyncCursorId } from '@soostori/core'

const APP_ID = process.env.INSTANT_APP_ID || ''
const SYNC_INTERVAL_MS = 30_000

let _timer: ReturnType<typeof setInterval> | null = null
let _lastSyncAt: string | null = null
let _wasOffline = false

function isOnline(): boolean {
  return (
    getSyncStore().get('cloudToken') != null &&
    APP_ID !== '' &&
    !getSyncStore().get('isOfflineMode')
  )
}

async function runCloudPull(): Promise<void> {
  if (!isOnline()) return

  // Phase 19: check subscription before applying cloud events
  const sub = checkCloudSubscription()
  if (sub.status === 'cancelled' || sub.status === 'blocked') {
    log.warn(`SyncTimerWorker: subscription ${sub.status} — pausing cloud sync`)
    dispatchSyncStatus('online')
    window.dispatchEvent(new CustomEvent('soostori:subscription:blocked', { detail: { status: sub.status } }))
    return
  }

  // Phase 19: enforce offline policy
  try {
    const shopId = await resolveActiveShopId().catch(() => 'default')
    const isOnlineFlag = true
    const lastVerifiedAt = (getSyncStore().get('subscriptionCheckedAt') as string | undefined) ?? new Date().toISOString()
    const offlineState = computeDesktopOfflineState({
      shopId,
      isOnline: isOnlineFlag,
      lastVerifiedAt,
      entitlement: null,
      offlineSince: null,
    })
    if (offlineState.phase === 'OFFLINE_LIMIT_EXCEEDED') {
      log.warn(`SyncTimerWorker: offline limit exceeded — pausing sync`)
      dispatchSyncStatus('online')
      window.dispatchEvent(new CustomEvent('soostori:offline:limit_exceeded'))
      return
    }
    if (offlineState.phase === 'OFFLINE_WARNING') {
      window.dispatchEvent(new CustomEvent('soostori:offline:warning', { detail: { daysOffline: offlineState.daysSinceVerification } }))
    }
  } catch { /* offline check is best-effort */ }

  try {
    const shopId = await resolveActiveShopId()
    const token = getSyncStore().get('cloudToken') as string | undefined
    const deviceId = getSyncStore().get('deviceId') as string || 'local'
    const cloud = new CloudClient({ appId: APP_ID, token })

    const engine = getRealSyncEngine()
    engine.setCloudClient(cloud)

    // Load persisted cursor (survives restart mid-sync)
    const persistedSyncAt = engine.loadCursor(deviceId, shopId)
    const lastSyncAt = persistedSyncAt ?? _lastSyncAt ?? null

    const cursor: SyncCursor = {
      cursorId: `cursor-${shopId}` as SyncCursorId,
      deviceId: asDeviceId(deviceId),
      businessId: asBusinessId(shopId),
      lastServerReceivedAt: lastSyncAt,
      lastOriginatingDeviceId: null,
      lastClientSequence: null,
      lastSyncAt: new Date().toISOString(),
    }

    dispatchSyncStatus('syncing')
    const events: SyncEvent[] = await engine.pull(cursor)

    if (events.length > 0) {
      for (const event of events) {
        const result = await engine.apply(null, event)
        // Record version_older conflicts to sync_conflicts for visibility
        if (result.state === 'version_older') {
          try {
            const { v4: uuidv4 } = await import('uuid')
            const conflictId = uuidv4()
            getDatabase().prepare(`
              INSERT OR IGNORE INTO sync_conflicts
                (id, shop_id, sale_id, device_id, employee_id, reason, payload, status, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
            `).run(
              conflictId,
              shopId,
              event.entityKind === 'sale' ? event.entityId : null,
              event.originatingDeviceId ?? 'unknown',
              event.originatingEmployeeId ?? 'system',
              'STALE_VERSION',
              JSON.stringify({ eventEntityVersion: result.eventEntityVersion, localEntityVersion: result.localEntityVersion, entityKind: event.entityKind, entityId: event.entityId }),
              new Date().toISOString(),
            )
            log.info(`SyncTimerWorker: recorded STALE_VERSION conflict for ${event.entityKind}:${event.entityId}`)
          } catch (err) {
            log.warn('SyncTimerWorker: failed to record version_older conflict', err)
          }
        }
      }
      log.info(`SyncTimerWorker: applied ${events.length} events`)
      // Phase 17: fire notifications for key business events
      for (const event of events) {
        const notifEvent = mapSyncEventToNotification(event)
        if (notifEvent) {
          notifyFromSyncEvent(notifEvent).catch(err =>
            log.warn('SyncTimerWorker: notification dispatch failed', err)
          )
        }
      }
    }

    const newSyncAt = new Date().toISOString()
    _lastSyncAt = newSyncAt
    // Persist cursor AFTER applying events — atomic with the apply cycle
    engine.persistCursor(deviceId, shopId, newSyncAt)
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

  // Wire network-up handler for immediate drain when coming back online
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      if (_wasOffline) {
        log.info('SyncTimerWorker: network restored, triggering immediate sync')
        _wasOffline = false
        setCloudOnline(true)
        runCloudPull().catch(() => {})
      }
    })
    window.addEventListener('offline', () => {
      _wasOffline = true
      setCloudOnline(false)
    })
  }

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

/**
 * Maps a SyncEvent (Phase 16) to a Phase 17 DesktopNotificationInput.
 * Only fires for user-visible business events that warrant a notification.
 */
function mapSyncEventToNotification(event: SyncEvent): {
  name: string
  payload: Record<string, unknown>
  priority: 'low' | 'normal' | 'high' | 'urgent'
} | null {
  const { entityKind, operation, payload } = event
  const p = payload as Record<string, unknown> ?? {}

  // Sale events
  if (entityKind === 'sale' && operation === 'create') {
    return { name: 'sale.created', payload: p, priority: 'normal' }
  }
  if (entityKind === 'sale' && operation === 'refund') {
    return { name: 'sale.refunded', payload: p, priority: 'high' }
  }

  // Debt events
  if (entityKind === 'debt' && operation === 'create') {
    return { name: 'debt.created', payload: p, priority: 'normal' }
  }
  if (entityKind === 'debt' && operation === 'payment') {
    return { name: 'debt.payment_recorded', payload: p, priority: 'normal' }
  }
  if (entityKind === 'debt' && operation === 'settle') {
    return { name: 'debt.settled', payload: p, priority: 'normal' }
  }

  // Expense events
  if (entityKind === 'expense' && operation === 'create') {
    return { name: 'expense.created', payload: p, priority: 'low' }
  }

  // Inventory events
  if (entityKind === 'inventory' && operation === 'low_stock') {
    return { name: 'inventory.low_stock', payload: p, priority: 'high' }
  }
  if (entityKind === 'inventory' && operation === 'receive') {
    return { name: 'inventory.received', payload: p, priority: 'low' }
  }
  if (entityKind === 'inventory' && operation === 'adjust') {
    return { name: 'inventory.adjusted', payload: p, priority: 'low' }
  }

  // Commission events
  if (entityKind === 'commission' && operation === 'create') {
    return { name: 'commission.created', payload: p, priority: 'high' }
  }

  return null
}
