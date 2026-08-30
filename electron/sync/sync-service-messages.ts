import { v4 as uuidv4 } from 'uuid'
import type { ClientMessageType, SyncMessage } from './types'
import { SyncClient } from './client'
import log from 'electron-log'

export function sendSalePending(
  client: SyncClient | null,
  mode: 'host' | 'client' | 'offline',
  deviceId: string,
  userId: string,
  saleData: { saleId: string; items: Array<{ productId: string; quantity: number }>; total: number; paymentMethod: string }
): string {
  const idempotencyKey = uuidv4()
  if (mode === 'client' && client) {
    const msg: SyncMessage = {
      type: 'SALE_PENDING',
      payload: {
        saleId: saleData.saleId,
        items: saleData.items,
        total: saleData.total,
        paymentMethod: saleData.paymentMethod,
        userId,
        deviceId,
      },
      deviceId,
      userId,
      idempotencyKey,
    }
    client.send(msg)
    log.info(`SyncService: SALE_PENDING sent (idempotencyKey=${idempotencyKey})`)
  }
  return idempotencyKey
}

export function sendLocalMutation(
  client: SyncClient | null,
  mode: 'host' | 'client' | 'offline',
  deviceId: string,
  userId: string,
  type: ClientMessageType,
  payload: unknown
): string {
  const idempotencyKey = uuidv4()
  if (mode === 'client' && client) {
    const msg: SyncMessage = { type, payload, deviceId, userId, idempotencyKey }
    client.send(msg)
    log.info(`SyncService: ${type} sent (idempotencyKey=${idempotencyKey})`)
  }
  return idempotencyKey
}
