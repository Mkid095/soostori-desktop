/**
 * server-handlers.ts — LAN sync server message router.
 * Split per ANPAS: sale → server-handler-sale.ts, stock → server-handler-stock.ts.
 */

import type { WebSocket } from 'ws'
import type { SyncEvent, ClientMessageType } from './types'
import type { ServerState } from './server-handlers-core'
import { handleSalePending } from './server-handler-sale'
import { handleStockAdjusted } from './server-handler-stock'
import { handleProductEvent } from './server-handler-product'
import { handleGetEventsAfter } from './server-handlers-core'

type IncomingMessage = { type: ClientMessageType; payload: unknown; sequenceNumber?: number; idempotencyKey?: string }

export function handleMessage(
  ws: WebSocket, msg: IncomingMessage, state: ServerState,
  _clients: Map<WebSocket, { deviceId: string; userId: string; lastSeq: number }>,
  broadcastFn: (event: SyncEvent, exclude?: WebSocket) => void,
): void {
  switch (msg.type) {
    case 'SALE_PENDING': handleSalePending(ws, msg, state, broadcastFn); break
    case 'STOCK_ADJUSTED': handleStockAdjusted(ws, msg, state, broadcastFn); break
    case 'PRODUCT_CREATED': case 'PRODUCT_UPDATED': case 'PRODUCT_DELETED':
    case 'CATEGORY_CREATED': case 'CATEGORY_UPDATED': case 'PRICE_CHANGED':
      handleProductEvent(msg.type as ClientMessageType, msg.payload, state, broadcastFn); break
    case 'GET_EVENTS_AFTER': handleGetEventsAfter(ws, msg.sequenceNumber ?? 0); break
    case 'HEARTBEAT': ws.send(JSON.stringify({ type: 'HEARTBEAT_ACK' })); break
  }
}
