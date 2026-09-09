/**
 * server-handler-stock.ts — STOCK_ADJUSTED handler for LAN sync server.
 * Part of server-handlers split per ANPAS.
 */

import { v4 as uuidv4 } from 'uuid'
import type { WebSocket } from 'ws'
import { getDatabase } from '../database'
import type { SyncEvent } from './types'
import type { ServerState } from './server-handlers-core'
import { createEvent, isDuplicateEvent, markEventProcessed, incrementAndBroadcast } from './server-handlers-core'

type IncomingMessage = { type: string; payload: unknown; idempotencyKey?: string }

export function handleStockAdjusted(
  ws: WebSocket, msg: IncomingMessage, state: ServerState,
  broadcastFn: (event: SyncEvent, exclude?: WebSocket) => void,
): void {
  const idempotencyKey = msg.idempotencyKey ?? ''
  if (isDuplicateEvent(state.deviceId, idempotencyKey)) return

  const db = getDatabase()
  const primary = db.prepare(
    'SELECT last_seen_ms FROM devices WHERE is_host = 1 AND shop_id = ? LIMIT 1',
  ).get(state.shopId) as { last_seen_ms: number | null } | undefined
  const ms = primary?.last_seen_ms ? Date.now() - primary.last_seen_ms : Infinity
  if (ms > 15_000) { ws.send(JSON.stringify({ type: 'STOCK_ADJUSTED_REJECTED', message: 'Primary unavailable' })); return }

  const payload = msg.payload as { productId: string; quantity: number; newBalance: number; eventType: string }
  db.prepare(`INSERT INTO inventory_transactions (id, shop_id, product_id, device_id, user_id, event_type, quantity, balance_after, payload, sequence_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(uuidv4(), state.shopId, payload.productId, state.deviceId, state.userId,
      payload.eventType, payload.quantity, payload.newBalance, JSON.stringify(payload), state.sequenceNumber)
  db.prepare(`UPDATE products SET current_stock = ?, updated_at = ? WHERE id = ?`)
    .run(payload.newBalance, new Date().toISOString(), payload.productId)

  const event = createEvent('STOCK_ADJUSTED', msg.payload, state)
  markEventProcessed(state.deviceId, idempotencyKey, event.id)
  incrementAndBroadcast(event, state, broadcastFn)
}
