// Sync domain types
export interface InventoryTransaction {
  id: string
  shop_id: string
  product_id: string
  device_id: string
  user_id: string
  event_type: string
  quantity: number
  balance_after: number
  status: 'pending' | 'confirmed' | 'rejected'
  payload: string | null
  sequence_number: number
  created_at: string
}

export interface SyncEvent {
  id: string
  deviceId: string
  userId: string
  eventType: string
  payload: unknown
  timestamp: string
  sequenceNumber?: number
}

export interface Sale {
  id: string
  shop_id: string
  user_id: string
  device_id: string
  status: 'pending' | 'confirmed' | 'rejected'
  total: number
  payment_method: string
  note: string
  created_at: string
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  subtotal: number
}

export interface SyncQueueItem {
  id: string
  device_id: string
  event_type: string
  payload: string
  status: 'pending' | 'sent' | 'failed'
  retry_count: number
  created_at: string
}

export interface InventorySnapshot {
  id: string
  shop_id: string
  product_count: number
  last_sequence: number
  created_at: string
}
