import { getDatabase } from '../database'
import type { SyncEvent, ServerEventType } from './types'

export function queryEventsAfter(seq: number): SyncEvent[] {
  const db = getDatabase()
  const rows = db.prepare(`
    SELECT * FROM sync_events WHERE sequence_number > ? ORDER BY sequence_number ASC
  `).all(seq) as Array<{
    id: string; device_id: string; event_type: string
    payload: string; sequence_number: number; created_at: string
  }>

  return rows.map(row => ({
    id: row.id,
    deviceId: row.device_id,
    userId: '',
    eventType: row.event_type as ServerEventType,
    payload: JSON.parse(row.payload),
    timestamp: row.created_at,
    sequenceNumber: row.sequence_number,
  }))
}
