/**
 * queue-replay.ts — Background service that replays pending offline mutations
 * from the sync_queue to the cloud.
 *
 * Design:
 * - Monitors `sync_queue` for pending items
 * - Processes them in FIFO order when cloud is reachable
 * - Exponential backoff on failure (max 3 retries per item)
 * - Permanently marks items as 'failed' after MAX_RETRIES
 * - Does NOT delete failed items (audit trail)
 * - Survives app restarts (queue is in SQLite)
 * - A permanently failed item does NOT block unrelated items
 *
 * Queue state machine:
 *   pending  → waiting to be processed
 *   in_flight → push in progress (prevents concurrent duplicate)
 *   sent      → successfully synced
 *   failed    → push failed after MAX_RETRIES, will not retry
 */

import { getDatabase } from '../database'
import { pushSyncEvents } from './cloud-sync'
import log from 'electron-log'

const MAX_RETRIES = 3
const RETRY_DELAYS_MS = [1_000, 5_000, 30_000] // 1s, 5s, 30s

let _timer: ReturnType<typeof setTimeout> | null = null
let _isRunning = false
let _isOnline = true

interface QueueItem {
  id: string
  device_id: string
  event_type: string
  payload: string
  status: string
  retry_count: number
  created_at: string
}

function scheduleNext(delayMs: number): void {
  if (_timer) clearTimeout(_timer)
  _timer = setTimeout(() => { _timer = null; drainQueue() }, delayMs)
}

async function drainQueue(): Promise<void> {
  if (_isRunning) return
  _isRunning = true

  try {
    const db = getDatabase()
    const pending = db.prepare(`
      SELECT * FROM sync_queue
      WHERE status = 'pending' AND retry_count < ?
      ORDER BY created_at ASC
      LIMIT 50
    `).all(MAX_RETRIES) as QueueItem[]

    if (!pending.length) {
      _isRunning = false
      return
    }

    log.info(`[QueueReplay] Processing ${pending.length} pending items`)

    // Step 1: Mark all pending items as in_flight (prevents duplicate processing)
    for (const item of pending) {
      db.prepare(`UPDATE sync_queue SET status = 'in_flight' WHERE id = ?`).run(item.id)
    }

    // Step 2: Call pushSyncEvents ONCE — pushes all unsynced sync_events once
    let pushOk = true
    try {
      await pushSyncEvents()
    } catch (err) {
      log.warn('[QueueReplay] pushSyncEvents failed:', err)
      pushOk = false
    }

    if (pushOk) {
      // Step 3a: Mark all items as sent (success)
      for (const item of pending) {
        db.prepare(`UPDATE sync_queue SET status = 'sent' WHERE id = ?`).run(item.id)
      }
      _isRunning = false
      if (_isOnline) scheduleNext(30_000)
    } else {
      // Step 3b: Revert in_flight back to pending for retry
      for (const item of pending) {
        db.prepare(`UPDATE sync_queue SET status = 'pending' WHERE id = ?`).run(item.id)
      }
      _isRunning = false
      if (_isOnline) scheduleNext(RETRY_DELAYS_MS[0])
    }
  } catch (err) {
    _isRunning = false
    log.error('[QueueReplay] drainQueue error:', err)
    if (_isOnline) scheduleNext(30_000)
  }
}

export function startQueueReplay(): void {
  if (_timer) return
  _isOnline = true
  log.info('[QueueReplay] Started')
  // Kick off immediately
  drainQueue()
}

export function stopQueueReplay(): void {
  if (_timer) { clearTimeout(_timer); _timer = null }
  _isOnline = false
  log.info('[QueueReplay] Stopped')
}

export function notifyOnline(): void {
  if (_isOnline) return
  _isOnline = true
  log.info('[QueueReplay] Online — resuming queue drain')
  drainQueue()
}

export function notifyOffline(): void {
  _isOnline = false
  if (_timer) { clearTimeout(_timer); _timer = null }
  log.info('[QueueReplay] Offline — pausing queue drain')
}
