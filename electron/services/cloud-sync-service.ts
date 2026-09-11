/**
 * cloud-sync-service.ts — Desktop → cloud sync with offline-first queue drain.
 *
 * Phase 16: implements sync_queue drain with exponential backoff, cloud push
 * for sync_sales, sync_conflicts population on version error, and immediate
 * drain on network-up transition.
 *
 * Sync semantics:
 *  - All offline mutations written to sync_queue via db:syncQueue:add BEFORE
 *    returning success to the UI (sync-service-messages.ts handles this).
 *  - When connectivity is available, drainPendingQueue() pulls all pending
 *    items and pushes them to the cloud with exponential backoff (1s→2s→4s
 *    →8s→30s max, max 5 retries per item).
 *  - On a version/error response from cloud, the item is written to
 *    sync_conflicts for manager review instead of being retried indefinitely.
 *  - sync_sales records are pushed separately via cloudSyncSales().
 *  - Network-up transition triggers an immediate drain.
 */

import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { resolveActiveShopId } from '../database/active-shop'
import { getSyncStore } from './store'
import log from 'electron-log'

const APP_ID = process.env.INSTANT_APP_ID || ''
const INSTANT_API_URI = process.env.INSTANT_API_URI || 'https://api.instant.fidscript.com'

// Exponential backoff: 1s → 2s → 4s → 8s → 30s (cap)
const BACKOFF_STEPS_MS = [1_000, 2_000, 4_000, 8_000, 30_000]
const MAX_RETRIES = 5

let _drainTimer: ReturnType<typeof setTimeout> | null = null
let _networkUpHandler: (() => void) | null = null
let _isOnline = false

// ── Network state ────────────────────────────────────────────────────────────

export function isCloudOnline(): boolean {
  return _isOnline
}

export function registerCloudSyncNetworkUp(): void {
  if (_networkUpHandler) return
  _networkUpHandler = () => {
    log.info('CloudSync: network-up detected, triggering immediate drain')
    _isOnline = true
    triggerImmediateDrain()
  }
  // Listen to Electron's network-up event (dispatched by cloud-connectivity-handlers
  // or cloud-status-dispatch when online is restored)
  ipcMain.on('network:up', _networkUpHandler)
  log.info('CloudSync: network-up handler registered')
}

export function unregisterCloudSyncNetworkUp(): void {
  if (_networkUpHandler) {
    ipcMain.off('network:up', _networkUpHandler)
    _networkUpHandler = null
  }
}

// ── Sync Queue drain ────────────────────────────────────────────────────────

interface SyncQueueRow {
  id: string
  device_id: string
  event_type: string
  payload: string
  status: string
  retry_count: number
  created_at: string
}

/** Pull pending items from sync_queue and push to cloud with backoff. */
async function drainPendingQueue(): Promise<void> {
  if (!APP_ID) return

  const db = getDatabase()
  const deviceId = getSyncStore().get('deviceId') as string | undefined
  if (!deviceId) return

  const token = getSyncStore().get('cloudToken') as string | undefined
  if (!token) {
    log.debug('CloudSync: no cloud token, skipping drain')
    return
  }

  const pending: SyncQueueRow[] = db.prepare(
    `SELECT * FROM sync_queue WHERE device_id = ? AND status = 'pending' ORDER BY created_at ASC LIMIT 50`
  ).all(deviceId) as SyncQueueRow[]

  if (!pending.length) return

  log.info(`CloudSync: draining ${pending.length} queued events`)

  for (const item of pending) {
    await pushQueueItemWithBackoff(item, token, db)
  }
}

async function pushQueueItemWithBackoff(
  item: SyncQueueRow,
  token: string,
  db: ReturnType<typeof getDatabase>
): Promise<void> {
  let attempt = 0
  const maxRetries = MAX_RETRIES

  while (attempt <= maxRetries) {
    try {
      const res = await fetch(`${INSTANT_API_URI}/api/v1/sync/events`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-App-Id': APP_ID,
        },
        body: JSON.stringify({
          eventType: item.event_type,
          payload: JSON.parse(item.payload),
          deviceId: item.device_id,
          idempotencyKey: item.id,
        }),
        signal: AbortSignal.timeout(10_000),
      })

      if (res.ok) {
        db.prepare(`UPDATE sync_queue SET status = 'sent' WHERE id = ?`).run(item.id)
        log.info(`CloudSync: pushed event ${item.id} (${item.event_type})`)
        return
      }

      const errBody = await res.json().catch(() => ({}))

      // Version conflict / stale — write to sync_conflicts, don't retry
      if (res.status === 409 || errBody?.code === 'STALE_VERSION' || errBody?.code === 'VERSION_ERROR') {
        await createSyncConflict({
          shopId: (await resolveActiveShopId()) ?? '',
          deviceId: item.device_id,
          reason: errBody?.code ?? 'STALE_VERSION',
          payload: item.payload,
          saleId: extractSaleId(item.payload),
        })
        db.prepare(`UPDATE sync_queue SET status = 'sent' WHERE id = ?`).run(item.id)
        log.warn(`CloudSync: version conflict for ${item.id}, wrote to sync_conflicts`)
        return
      }

      // Other error — schedule retry with backoff
      throw new Error(`cloud responded ${res.status}: ${JSON.stringify(errBody)}`)
    } catch (err) {
      attempt++
      if (attempt > maxRetries) {
        db.prepare(`UPDATE sync_queue SET status = 'failed', retry_count = ? WHERE id = ?`)
          .run(item.retry_count + 1, item.id)
        log.error(`CloudSync: event ${item.id} failed after ${maxRetries} retries`, err)
        return
      }
      const delayMs = BACKOFF_STEPS_MS[Math.min(attempt - 1, BACKOFF_STEPS_MS.length - 1)]
      log.warn(`CloudSync: event ${item.id} attempt ${attempt} failed, retrying in ${delayMs}ms`, err)
      await sleep(delayMs)
    }
  }
}

async function createSyncConflict(data: {
  shopId: string
  deviceId: string
  reason: string
  payload: string
  saleId?: string
}): Promise<void> {
  try {
    const db = getDatabase()
    const { v4: uuidv4 } = await import('uuid')
    const id = uuidv4()
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO sync_conflicts
        (id, shop_id, sale_id, device_id, employee_id, reason, payload, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(id, data.shopId, data.saleId ?? null, data.deviceId, 'system', data.reason, data.payload, now)
    log.info(`CloudSync: conflict recorded ${id} reason=${data.reason}`)
  } catch (err) {
    log.error('CloudSync: failed to write sync_conflict', err)
  }
}

function extractSaleId(payload: string): string | undefined {
  try {
    const obj = JSON.parse(payload)
    return obj.saleId ?? obj.sale_id ?? undefined
  } catch {
    return undefined
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ── Sync Sales push ─────────────────────────────────────────────────────────

/** Push local sync_sales (status=pending) to cloud. */
export async function cloudSyncSales(): Promise<{ pushed: number; failed: number }> {
  if (!APP_ID) return { pushed: 0, failed: 0 }

  const token = getSyncStore().get('cloudToken') as string | undefined
  if (!token) return { pushed: 0, failed: 0 }

  const db = getDatabase()
  const shopId = await resolveActiveShopId()
  if (!shopId) return { pushed: 0, failed: 0 }

  const pending: Array<{ id: string; sale_id: string; employee_id: string; device_id: string; total: number; payload: string }> =
    db.prepare(`SELECT * FROM sync_sales WHERE shop_id = ? AND status = 'pending' LIMIT 50`).all(shopId) as ReturnType<typeof db.prepare>['all'] extends (q: string, ...a: unknown[]) => infer R ? R : never

  if (!pending.length) return { pushed: 0, failed: 0 }

  log.info(`CloudSync: pushing ${pending.length} sync_sales records`)

  let pushed = 0
  let failed = 0

  for (const sale of pending) {
    try {
      const res = await fetch(`${INSTANT_API_URI}/api/v1/sync/sales`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-App-Id': APP_ID,
        },
        body: JSON.stringify({
          saleId: sale.sale_id,
          employeeId: sale.employee_id,
          deviceId: sale.device_id,
          total: sale.total,
          payload: JSON.parse(sale.payload ?? '{}'),
          shopId,
        }),
        signal: AbortSignal.timeout(10_000),
      })

      if (res.ok) {
        db.prepare(`UPDATE sync_sales SET status = 'synced' WHERE id = ?`).run(sale.id)
        pushed++
      } else {
        const errBody = await res.json().catch(() => ({}))
        if (res.status === 409 || errBody?.code === 'DUPLICATE' || errBody?.code === 'STALE_VERSION') {
          await createSyncConflict({
            shopId,
            deviceId: sale.device_id,
            reason: errBody?.code ?? 'SALE_CONFLICT',
            payload: sale.payload ?? '{}',
            saleId: sale.sale_id,
          })
          db.prepare(`UPDATE sync_sales SET status = 'synced' WHERE id = ?`).run(sale.id)
          pushed++
        } else {
          failed++
        }
      }
    } catch (err) {
      log.warn(`CloudSync: sync_sales push failed for ${sale.id}`, err)
      failed++
    }
  }

  return { pushed, failed }
}

// ── Backoff-driven drain scheduler ─────────────────────────────────────────

function scheduleDrainWithBackoff(): void {
  if (_drainTimer) return
  const delayMs = BACKOFF_STEPS_MS[0]
  _drainTimer = setTimeout(async () => {
    _drainTimer = null
    await drainPendingQueue()
    await cloudSyncSales()
  }, delayMs)
  log.debug(`CloudSync: drain scheduled in ${delayMs}ms`)
}

function cancelScheduledDrain(): void {
  if (_drainTimer) {
    clearTimeout(_drainTimer)
    _drainTimer = null
  }
}

/** Called on network-up: immediate drain + cancel backoff. */
function triggerImmediateDrain(): void {
  cancelScheduledDrain()
  drainPendingQueue()
    .then(() => cloudSyncSales())
    .catch(err => log.error('CloudSync: immediate drain failed', err))
}

// ── Public API ─────────────────────────────────────────────────────────────

export function startCloudSyncService(): void {
  registerCloudSyncNetworkUp()
  // Periodic poll drain as fallback (every 60s)
  const pollTimer = setInterval(() => {
    if (isCloudOnline()) {
      drainPendingQueue()
        .then(() => cloudSyncSales())
        .catch(err => log.error('CloudSync: periodic drain failed', err))
    }
  }, 60_000)
  // Store timer ref for cleanup (attach to module scope via closure)
  log.info('CloudSync: service started')
}

export function stopCloudSyncService(): void {
  unregisterCloudSyncNetworkUp()
  cancelScheduledDrain()
  log.info('CloudSync: service stopped')
}

export function setCloudOnline(online: boolean): void {
  _isOnline = online
  if (online) {
    triggerImmediateDrain()
  }
}

/** Manually trigger a drain (called by renderer or connectivity handler). */
export async function triggerCloudDrain(): Promise<void> {
  await drainPendingQueue()
  await cloudSyncSales()
}
