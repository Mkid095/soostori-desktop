/**
 * Offline state — canonical Desktop adapter.
 *
 * Phase 11.2 Batch D: collapses Desktop's competing offline-window
 * computations (sync-service, subscription-enforcer, cloud-service) onto
 * a single @soostori/offline.computeOfflineState() invocation.
 *
 * Locked business rules preserved bit-for-bit:
 *   Maximum offline = 3 days   (OFFLINE_GRACE_DAYS from @soostori/core)
 *   Subscription grace: derived from entitlement in policy inputs
 *   Expired after grace = OFFLINE_LIMIT_EXCEEDED, canSell=false
 */

import { OFFLINE_GRACE_DAYS } from '@soostori/core'
import { computeOfflineState, type OfflineState as SdkOfflineState } from '@soostori/offline'
import type { ShopId } from '@soostori/core'

/** Re-export the SDK's authoritative type. */
export type OfflineState = SdkOfflineState

/**
 * Compute the authoritative offline state for the local device.
 *
 * Inputs are gathered by the caller — the Desktop adapter does not own
 * Electron timers or cloud network. Use `daysSinceVerification` and the
 * cached `entitlement` from CloudService.
 */
export function computeDesktopOfflineState(inputs: {
  shopId: ShopId
  isOnline: boolean
  lastVerifiedAt: string
  entitlement: Parameters<typeof computeOfflineState>[0]['entitlement']
  primaryLost?: boolean
  subscriptionExpired?: boolean
  offlineSince?: string | null
  now?: Date
}): OfflineState {
  return computeOfflineState({
    shopId: inputs.shopId,
    isOnline: inputs.isOnline,
    lastVerifiedAt: inputs.lastVerifiedAt,
    entitlement: inputs.entitlement,
    primaryLost: inputs.primaryLost ?? false,
    subscriptionExpired: inputs.subscriptionExpired ?? false,
    offlineSince: inputs.offlineSince ?? null,
    now: inputs.now,
  })
}

/** Locked constant — only place to read the threshold. */
export const DESKTOP_OFFLINE_GRACE_DAYS = OFFLINE_GRACE_DAYS
