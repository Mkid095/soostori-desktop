/**
 * server-handler-product.ts — Product/category event handlers for LAN sync server.
 * Part of server-handlers split per ANPAS.
 */

import type { SyncEvent, ClientMessageType } from './types'
import type { ServerState } from './server-handlers-core'
import { createEvent, incrementAndBroadcast, markEventProcessed } from './server-handlers-core'

export function handleProductEvent(
  type: ClientMessageType, payload: unknown, state: ServerState,
  broadcastFn: (event: SyncEvent, exclude?: import('ws').WebSocket) => void,
): void {
  const event = createEvent(type, payload, state)
  incrementAndBroadcast(event, state, broadcastFn)
  const entityId = typeof payload === 'object' && payload !== null && 'id' in payload
    ? (payload as { id: string }).id : event.id
  markEventProcessed(state.deviceId, `${type}:${entityId}`, event.id)
}
