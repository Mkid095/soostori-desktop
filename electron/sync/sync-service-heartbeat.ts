/**
 * sync-service-heartbeat.ts — Host heartbeat management for SyncService.
 * Extracted per ANPAS to keep sync-service.ts ≤150 lines.
 */

import { getDatabase } from '../database'
import log from 'electron-log'

export function startHeartbeat(deviceId: string): ReturnType<typeof setInterval> {
  return setInterval(() => {
    try {
      const db = getDatabase()
      db.prepare('UPDATE devices SET last_seen = ?, last_seen_ms = ? WHERE id = ?')
        .run(new Date().toISOString(), Date.now(), deviceId)
    } catch (err) {
      log.warn('SyncService: heartbeat update failed', err)
    }
  }, 5_000)
}

export function stopHeartbeat(interval: ReturnType<typeof setInterval> | null): void {
  if (interval) { clearInterval(interval); log.info('SyncService: heartbeat stopped') }
}
