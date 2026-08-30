// Shared event types for desktop <-> mobile sync
// SINGLE SOURCE OF TRUTH — both desktop sync service and future mobile client import from here
export type SyncEventType =
  | 'SALE_PENDING' | 'SALE_CONFIRMED' | 'SALE_REJECTED'
  | 'STOCK_ADJUSTED' | 'PRODUCT_CREATED' | 'PRODUCT_UPDATED' | 'PRODUCT_DELETED'
  | 'DEVICE_PAIRED' | 'DEVICE_OFFLINE' | 'HOST_TRANSFER'
  | 'GET_EVENTS_AFTER' | 'HEARTBEAT_ACK'
