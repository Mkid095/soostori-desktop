import { v4 as uuidv4 } from 'uuid'
import { WebSocket } from 'ws'
import { getDatabase } from '../database'
import type { SyncEvent } from './types'
import type { ClientMessageType, ServerEventType } from './types'
import {
  type ServerState,
  createEvent,
  incrementAndBroadcast,
  isDuplicateEvent,
  markEventProcessed,
  handleGetEventsAfter,
} from './server-handlers-core'

// Re-export for server.ts
export { type ServerState, createEvent }

type IncomingMessage = {
  type: ClientMessageType
  payload: unknown
  sequenceNumber?: number
  idempotencyKey?: string
}

export function handleMessage(
  ws: WebSocket,
  msg: IncomingMessage,
  state: ServerState,
  _clients: Map<WebSocket, { deviceId: string; userId: string; lastSeq: number }>,
  broadcastFn: (event: SyncEvent, exclude?: WebSocket) => void
): void {
  switch (msg.type) {
    case 'SALE_PENDING':
      handleSalePending(ws, msg, state, broadcastFn)
      break
    case 'STOCK_ADJUSTED':
      handleStockAdjusted(msg, state, broadcastFn)
      break
    case 'PRODUCT_CREATED':
    case 'PRODUCT_UPDATED':
    case 'PRODUCT_DELETED':
    case 'CATEGORY_CREATED':
    case 'CATEGORY_UPDATED':
    case 'PRICE_CHANGED':
      handleProductEvent(msg.type, msg.payload, state, broadcastFn)
      break
    case 'GET_EVENTS_AFTER':
      handleGetEventsAfter(ws, msg.sequenceNumber ?? 0)
      break
    case 'HEARTBEAT':
      ws.send(JSON.stringify({ type: 'HEARTBEAT_ACK' }))
      break
  }
}

function handleSalePending(
  ws: WebSocket,
  msg: IncomingMessage,
  state: ServerState,
  broadcastFn: (event: SyncEvent, exclude?: WebSocket) => void
): void {
  const idempotencyKey = msg.idempotencyKey ?? ''
  if (isDuplicateEvent(state.deviceId, idempotencyKey)) return

  const items = (msg.payload as { items?: Array<{ productId: string; quantity: number }> })?.items ?? []
  const db = getDatabase()
  let hasStock = true

  for (const item of items) {
    const product = db.prepare(
      'SELECT COALESCE(current_stock, stock_quantity) as stock FROM products WHERE id = ?'
    ).get(item.productId) as { stock: number } | undefined
    if (!product || product.stock < item.quantity) {
      hasStock = false
      break
    }
  }

  const eventType: ServerEventType = hasStock ? 'SALE_CONFIRMED' : 'SALE_REJECTED'
  const event = createEvent('SALE_PENDING', msg.payload, state)
  ws.send(JSON.stringify({ ...event, eventType }))
  incrementAndBroadcast(event, state, broadcastFn)
  markEventProcessed(state.deviceId, idempotencyKey, event.id)

  if (!hasStock) {
    const salePayload = msg.payload as { saleId?: string }
    db.prepare(`
      INSERT INTO sync_conflicts (id, shop_id, sale_id, device_id, employee_id, reason, payload, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'INSUFFICIENT_STOCK', ?, 'pending', ?)
    `).run(
      uuidv4(), state.shopId, salePayload.saleId || null,
      state.deviceId, state.userId,
      JSON.stringify(msg.payload), new Date().toISOString()
    )
  }
}

function handleStockAdjusted(
  msg: IncomingMessage,
  state: ServerState,
  broadcastFn: (event: SyncEvent, exclude?: WebSocket) => void
): void {
  const idempotencyKey = msg.idempotencyKey ?? ''
  if (isDuplicateEvent(state.deviceId, idempotencyKey)) return

  const db = getDatabase()
  const payload = msg.payload as {
    productId: string; quantity: number; newBalance: number; eventType: string
  }

  db.prepare(`
    INSERT INTO inventory_transactions
      (id, shop_id, product_id, device_id, user_id, event_type, quantity, balance_after, payload, sequence_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    uuidv4(), state.shopId, payload.productId, state.deviceId, state.userId,
    payload.eventType, payload.quantity, payload.newBalance,
    JSON.stringify(payload), state.sequenceNumber
  )

  db.prepare(`UPDATE products SET current_stock = ?, updated_at = ? WHERE id = ?`)
    .run(payload.newBalance, new Date().toISOString(), payload.productId)

  const event = createEvent('STOCK_ADJUSTED', msg.payload, state)
  incrementAndBroadcast(event, state, broadcastFn)
  markEventProcessed(state.deviceId, idempotencyKey, event.id)
}

function handleProductEvent(
  type: ClientMessageType,
  payload: unknown,
  state: ServerState,
  broadcastFn: (event: SyncEvent, exclude?: WebSocket) => void
): void {
  const event = createEvent(type, payload, state)
  incrementAndBroadcast(event, state, broadcastFn)
}
