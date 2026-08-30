import { v4 as uuidv4 } from 'uuid'
import { WebSocket } from 'ws'
import { getDatabase } from '../database'
import type { SyncEvent } from './types'
import type { ClientMessageType } from './types'
import { queryEventsAfter } from './server-queries'

export interface ServerState {
  deviceId: string
  userId: string
  shopId: string
  sequenceNumber: number
}

type IncomingMessage = {
  type: ClientMessageType
  payload: unknown
  sequenceNumber?: number
  idempotencyKey?: string
}

export function createEvent(type: string, payload: unknown, state: ServerState): SyncEvent {
  return {
    id: uuidv4(),
    deviceId: state.deviceId,
    userId: state.userId,
    eventType: type as SyncEvent['eventType'],
    payload,
    timestamp: new Date().toISOString(),
    sequenceNumber: state.sequenceNumber,
  }
}

export function incrementAndBroadcast(
  event: SyncEvent,
  state: ServerState,
  broadcastFn: (event: SyncEvent, exclude?: WebSocket) => void
): void {
  state.sequenceNumber++
  const db = getDatabase()
  db.prepare(`
    INSERT INTO sync_events (id, shop_id, device_id, event_type, payload, sequence_number)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(event.id, state.shopId, state.deviceId, event.eventType, JSON.stringify(event.payload), state.sequenceNumber)
  broadcastFn(event)
}

export function isDuplicateEvent(deviceId: string, idempotencyKey: string): boolean {
  if (!idempotencyKey) return false
  const db = getDatabase()
  const row = db.prepare(
    'SELECT id FROM sync_processed WHERE device_id = ? AND idempotency_key = ?'
  ).get(deviceId, idempotencyKey)
  return !!row
}

export function markEventProcessed(deviceId: string, idempotencyKey: string, eventId: string): void {
  if (!idempotencyKey) return
  const db = getDatabase()
  db.prepare(
    'INSERT OR IGNORE INTO sync_processed (id, device_id, idempotency_key, event_id, processed_at) VALUES (?, ?, ?, ?, ?)'
  ).run(uuidv4(), deviceId, idempotencyKey, eventId, new Date().toISOString())
}

export function handleGetEventsAfter(ws: WebSocket, seq: number): void {
  const events = queryEventsAfter(seq)
  ws.send(JSON.stringify({ type: 'GET_EVENTS_AFTER', payload: events }))
}
