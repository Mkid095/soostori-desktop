/**
 * CloudSyncService — handles Desktop → cloud backup push/pull.
 *
 * PHASE 1: All methods are stubs. The app is fully offline-capable.
 * PHASE 3: Replace each TODO block with real fidscript_api calls.
 *
 * Sync strategy:
 *   - OUTBOUND: local committed events are queued and pushed in batches
 *   - INBOUND: periodic pull for shop-level events (price changes, employee updates)
 *   - Conflict: server-wins for pricing/employee data; local-wins for confirmed sales
 */

import { getSyncStore } from './store'
import log from 'electron-log'

export interface CloudSyncConfig {
  apiBaseUrl: string
  apiKey: string
  shopId: string
  deviceId: string
}

interface QueuedEvent {
  id: string
  eventType: string
  payload: string
  createdAt: string
}

let _config: CloudSyncConfig | null = null
let _pushTimer: ReturnType<typeof setInterval> | null = null
let _pullTimer: ReturnType<typeof setInterval> | null = null

export function configureCloudSync(config: CloudSyncConfig): void {
  _config = config
  log.info('CloudSync: configured')
}

export function startCloudSync(): void {
  if (_pushTimer) return
  _pushTimer = setInterval(() => { pushQueuedEvents().catch(() => {}) }, 60_000)  // push every 60s
  _pullTimer = setInterval(() => { pullCloudEvents().catch(() => {}) }, 5 * 60_000)  // pull every 5 min
  log.info('CloudSync: started')
}

export function stopCloudSync(): void {
  if (_pushTimer) { clearInterval(_pushTimer); _pushTimer = null }
  if (_pullTimer) { clearInterval(_pullTimer); _pullTimer = null }
  log.info('CloudSync: stopped')
}

export async function pushQueuedEvents(): Promise<void> {
  if (!_config) return
  // TODO (Phase 3):
  // const store = getSyncStore()
  // const queue: QueuedEvent[] = store.get('cloudSyncQueue') ?? []
  // if (!queue.length) return
  // const res = await fetch(`${_config.apiBaseUrl}/sync/push`, {
  //   method: 'POST',
  //   headers: { Authorization: `Bearer ${_config.apiKey}`, 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ events: queue }),
  // })
  // if (res.ok) { store.set('cloudSyncQueue', []) }
  log.debug('CloudSync: push attempted (stub)')
}

export async function pullCloudEvents(): Promise<void> {
  if (!_config) return
  // TODO (Phase 3):
  // const store = getSyncStore()
  // const lastSeq: number = store.get('cloudLastSeq') ?? 0
  // const res = await fetch(`${_config.apiBaseUrl}/sync/pull?since=${lastSeq}&shopId=${_config.shopId}`, {
  //   headers: { Authorization: `Bearer ${_config.apiKey}` }
  // })
  // if (!res.ok) return
  // const { events } = await res.json() as { events: CloudSyncEvent[] }
  // for (const ev of events) {
  //   applyCloudEvent(ev)  // update local DB as needed
  //   store.set('cloudLastSeq', ev.sequenceNumber)
  // }
  log.debug('CloudSync: pull attempted (stub)')
}

export async function isCloudReachable(): Promise<boolean> {
  if (!_config) return false
  // TODO (Phase 3): real reachability check
  // try {
  //   const res = await fetch(`${_config.apiBaseUrl}/health`, { method: 'HEAD', signal: AbortSignal.timeout(3000) })
  //   return res.ok
  // } catch { return false }
  return false
}
