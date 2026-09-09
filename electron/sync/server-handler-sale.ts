/**
 * server-handler-sale.ts — SALE_PENDING handler for LAN sync server.
 * Part of server-handlers split per ANPAS.
 */

import { v4 as uuidv4 } from 'uuid'
import { WebSocket } from 'ws'
import { getDatabase } from '../database'
import type { SyncEvent } from './types'
import type { ServerState } from './server-handlers-core'
import { createEvent, isDuplicateEvent, markEventProcessed } from './server-handlers-core'
import { commitSale } from '../sdk/sale-orchestrator'

type IncomingMessage = { type: string; payload: unknown; idempotencyKey?: string }

export function handleSalePending(
  ws: WebSocket, msg: IncomingMessage, state: ServerState,
  broadcastFn: (event: SyncEvent, exclude?: WebSocket) => void,
): void {
  const idempotencyKey = msg.idempotencyKey ?? ''
  if (isDuplicateEvent(state.deviceId, idempotencyKey)) return

  const payload = msg.payload as {
    saleId?: string; items?: Array<{ productId: string; quantity: number }>
    paymentMethod?: string; paidAmount?: number; customerId?: string
    customerName?: string; note?: string
  }

  const saleId = payload.saleId ?? uuidv4()
  const db = getDatabase()
  const enrichedItems = (payload.items ?? []).map(i => {
    const product = db.prepare('SELECT name, selling_price FROM products WHERE id = ?').get(i.productId) as
      { name: string; selling_price: number } | undefined
    const unitPrice = product?.selling_price ?? 0
    return { productId: i.productId, productName: product?.name ?? 'Unknown', quantity: i.quantity,
      unitPrice, discount: 0, totalPrice: unitPrice * i.quantity, variationName: undefined }
  })

  commitSale({
    saleId, items: enrichedItems,
    paymentMethod: (payload.paymentMethod ?? 'cash') as 'cash' | 'mobile_money' | 'card' | 'transfer' | 'debt',
    paidAmount: payload.paidAmount ?? 0, discountAmount: 0, taxAmount: 0,
    note: payload.note, customerId: payload.customerId, customerName: payload.customerName,
    deviceId: state.deviceId, userId: state.userId,
  }).then(response => {
    if (idempotencyKey) markEventProcessed(state.deviceId, idempotencyKey, response.saleId)
    const confirmedPayload = {
      saleId: response.saleId,
      shopId: state.shopId,
      userId: state.userId,
      deviceId: state.deviceId,
      items: enrichedItems.map(i => ({ productId: i.productId, quantity: i.quantity })),
      paymentMethod: payload.paymentMethod ?? 'cash',
      totalAmount: enrichedItems.reduce((s, i) => s + i.totalPrice, 0),
      note: payload.note ?? undefined,
      customerId: payload.customerId ?? undefined,
      customerName: payload.customerName ?? undefined,
    }
    ws.send(JSON.stringify({ type: 'SALE_CONFIRMED' as const, saleId: response.saleId }))
    const event = createEvent('SALE_CONFIRMED', confirmedPayload, state)
    broadcastFn(event, ws)
  }).catch((err: unknown) => {
    const error = err as { code?: string; message: string }
    ws.send(JSON.stringify({ type: 'SALE_REJECTED', saleId,
      rejectionReason: error.code === 'STOCK_AUTHORIZATION_ERROR' ? 'PRIMARY_UNAVAILABLE_OFFLINE_TOO_LONG' : 'INSUFFICIENT_STOCK',
      message: error.message }))
  })
}
