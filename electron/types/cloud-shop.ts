/**
 * Cloud shop, subscription, and sync types — shared across web, mobile, and desktop.
 */

export interface CloudShop {
  id: string
  name: string
  slug: string
  taxRate: number
  plan: string
  subscriptionExpiry: string
  status: string
  currency?: string
}

export interface CloudSubscription {
  id: string
  shopId: string
  planKey: string
  status: string
  billingCycle: string
  deviceLimit: number
  amountPaid: number
  currentPeriodStart: string
  currentPeriodEnd: string
}

export interface CloudPlan {
  id: string
  key: string
  name: string
  priceMonthly: number
  priceYearly: number
  deviceLimit: number
  features: Record<string, unknown>
}

export interface CloudSubscriptionEvent {
  id: string
  type: string
  details: unknown
}

export interface CloudSyncEvent {
  id: string
  entityId: string
  entity: string
  operation: string
  payload: unknown
  idempotencyKey: string
  version: number
  timestamp: string
  syncedAt: string
}

export interface CloudSyncStatus {
  id: string
  shopId: string
  lastSyncAt: string
  pendingEvents: number
  deviceCount: number
  activeDeviceCount: number
}

export interface CloudBackupSnapshot {
  id: string
  shopId: string
  version: number
  snapshotId: string
  expiresAt?: string
  recordCounts: Record<string, number>
  sizeBytes: number
}

export interface CloudPayment {
  id: string
  amount: number
  status: string
  currency: string
  method: string
  reference: string
  paidAt: string
}
