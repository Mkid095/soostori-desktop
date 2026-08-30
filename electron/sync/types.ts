// Outgoing messages (client → server) — server never sees these as SyncEvent.eventType
export type ClientMessageType = 'HEARTBEAT' | 'GET_EVENTS_AFTER' | 'SALE_PENDING'
  | 'STOCK_ADJUSTED' | 'PRODUCT_CREATED' | 'PRODUCT_UPDATED' | 'PRODUCT_DELETED'
  | 'CATEGORY_CREATED' | 'CATEGORY_UPDATED' | 'PRICE_CHANGED'

// Incoming events (server → client)
export type ServerEventType =
  | 'SALE_PENDING' | 'SALE_CONFIRMED' | 'SALE_REJECTED'
  | 'STOCK_ADJUSTED' | 'PRODUCT_CREATED' | 'PRODUCT_UPDATED' | 'PRODUCT_DELETED'
  | 'CATEGORY_CREATED' | 'CATEGORY_UPDATED' | 'PRICE_CHANGED'
  | 'DEVICE_ONLINE' | 'DEVICE_OFFLINE'
  | 'HOST_TRANSFER' | 'HEARTBEAT_ACK'

export type SyncEventType = ClientMessageType | ServerEventType

export interface SyncEvent {
  id: string
  deviceId: string
  userId: string
  eventType: SyncEventType
  payload: unknown
  timestamp: string
  sequenceNumber?: number
}

export interface SyncMessage {
  type: ClientMessageType
  payload: unknown
  deviceId?: string
  userId?: string
  sequenceNumber?: number
  idempotencyKey?: string
}

// ─── LAN Discovery ───────────────────────────────────────────────────────────

export const DISCOVERY_PORT = 18793
export const DISCOVERY_MAGIC = 'SOOSTORI_DISCOVER'
export const DISCOVERY_VERSION = 1

export interface DiscoveryAdvert {
  magic: typeof DISCOVERY_MAGIC
  version: number
  shopId: string
  shopName: string
  deviceId: string
  deviceName: string
  deviceType: 'desktop' | 'mobile'
  isHost: boolean
  wsPort: number
  employeeId: string
  employeeName: string
  appVersion: string
}

export interface DiscoveryRequest {
  magic: typeof DISCOVERY_MAGIC
  version: number
  shopId: string
  clientDeviceId: string
}

export type DiscoveryMessage = DiscoveryAdvert | DiscoveryRequest
