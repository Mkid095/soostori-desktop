/**
 * cloud-schema.ts — Canonical shared cloud schema types.
 *
 * Re-exports from typed domain files. All three apps (web, mobile, desktop)
 * must use these field shapes.
 */

// Re-export for backward compatibility
export type {
  CloudUser,
  CloudEmployee,
  CloudDevice,
  CloudInvitation,
  CloudDeviceAuthorization,
  SessionData,
} from '../types/cloud-identity'

export type {
  CloudShop,
  CloudSubscription,
  CloudPlan,
  CloudSubscriptionEvent,
  CloudSyncEvent,
  CloudSyncStatus,
  CloudBackupSnapshot,
  CloudPayment,
} from '../types/cloud-shop'

export type {
  CloudProduct,
  CloudCategory,
  CloudSale,
  CloudCustomer,
  CloudExpense,
  MagicCodeResponse,
} from '../types/cloud-operational'
