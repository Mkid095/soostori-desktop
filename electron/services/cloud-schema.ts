/**
 * cloud-schema.ts — Canonical shared cloud schema types.
 * All three apps (web, mobile, desktop) must use these fields.
 */

// ── Core entities (shared across all three apps) ─────────────────────────────

export interface CloudUser {
  id: string
  email: string
  imageURL?: string
  type: 'owner' | 'manager' | 'attendant'
}

export interface CloudShop {
  id: string
  name: string
  slug: string
  taxRate: number
  plan: string
  subscriptionExpiry: string
  status: string
}

export interface CloudEmployee {
  id: string
  shopId: string
  name: string
  email?: string
  phone?: string
  role: 'owner' | 'manager' | 'attendant'
  status: string
  createdBy?: string
  invitedBy?: string
}

export interface CloudDevice {
  id: string
  shopId: string
  deviceId: string
  deviceName?: string
  deviceType: 'mobile' | 'desktop'
  isLanHost: boolean
  status: string
  lastSeenAt?: string
  authorizedAt?: string
  lastSyncAt?: string
  tokenRef?: string
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

export interface CloudSyncEvent {
  id: string
  entityId: string
  entity: string
  operation: string
  payload: unknown
  syncedAt: string
}

export interface CloudInvitation {
  id: string
  shopId: string
  employeeId: string
  code: string
  expiresAt: string
  status: string
  email?: string
  phone?: string
  createdBy?: string
  employeeRole?: string
}

export interface CloudSyncStatus {
  id: string
  shopId: string
  lastSyncAt: string
  pendingEvents: number
  deviceCount: number
  activeDeviceCount: number
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

export interface CloudBackupSnapshot {
  id: string
  shopId: string
  version: number
  snapshotId: string
  expiresAt?: string
  recordCounts: Record<string, number>
  sizeBytes: number
}

export interface CloudDeviceAuthorization {
  id: string
  deviceId: string
  authorizedBy: string
  tokenHash: string
  issuedAt: string
  expiresAt?: string
}

export interface CloudSubscriptionEvent {
  id: string
  type: string
  details: unknown
}

// ── Operational entities (need to be added to cloud schema) ───────────────────
// These are operational data that should sync between devices via cloud.
// Currently only in local SQLite — they need cloud representation.

export interface CloudProduct {
  id: string
  shopId: string
  name: string
  barcode: string
  sku: string
  categoryId: string
  categoryName: string
  costPrice: number
  sellingPrice: number
  groupPrices: string  // JSON array
  isGroup: boolean
  unitsPerPackage: number
  stockQuantity: number
  currentStock: number
  lowStockThreshold: number
  trackInventory: number
  allowSingleUnitSale: number
  distributorName: string
  distributorPhone: string
  image: string
  isActive: number
  createdAt: string
  updatedAt: string
}

export interface CloudCategory {
  id: string
  shopId: string
  name: string
  color: string
  description?: string
  isActive: number
  createdAt: string
  updatedAt: string
}

export interface CloudSale {
  id: string
  shopId: string
  userId: string
  deviceId: string
  type: string
  status: string
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  paidAmount: number
  paymentMethod: string
  note: string
  customerId: string
  customerName: string
  customerPhone: string
  itemsSummary: string
  createdAt: string
  updatedAt: string
}

export interface CloudCustomer {
  id: string
  shopId: string
  name: string
  phone: string
  email: string
  idNumber: string
  address: string
  notes: string
  isActive: number
  createdAt: string
  updatedAt: string
}

export interface CloudExpense {
  id: string
  shopId: string
  categoryId: string
  categoryName: string
  amount: number
  description: string
  reference: string
  date: string
  createdAt: string
  updatedAt: string
}

// ── Auth response types ───────────────────────────────────────────────────────

export interface MagicCodeResponse {
  ok: boolean
  userId?: string
  email?: string
  error?: string
}

export interface SessionData {
  userId: string
  deviceId: string
  shopId: string
  employeeId: string
  email: string
}
