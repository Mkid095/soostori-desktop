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
 *
 * P1-5: clock-manipulation guard added — `now` is validated against the
 * persisted first-launch floor. If rolled back, throws ClockTamperingError.
 */

import { OFFLINE_GRACE_DAYS } from '@soostori/core'
import { computeOfflineState, type OfflineState as SdkOfflineState } from '@soostori/offline'
import type { ShopId } from '@soostori/core'
import { assertClockNotTampered } from './monotonic-clock'

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
  /** P1-05: watermark — once grace reaches 0 it never resets. */
  offlineGraceExhaustedAt?: string | null
  entitlement: Parameters<typeof computeOfflineState>[0]['entitlement']
  primaryLost?: boolean
  subscriptionExpired?: boolean
  offlineSince?: string | null
  now?: Date
}): OfflineState {
  // P1-5: guard the wall-clock anchor. Either accept the caller's `now`
  // (validated) or derive `Date.now()` ourselves and validate it. Without
  // this, a user rolling the clock back can keep trading forever.
  const nowMs = inputs.now ? inputs.now.getTime() : Date.now()
  assertClockNotTampered(nowMs)

  // P1-05: If grace was already exhausted, the device stays blocked — even
  // after reconnecting to cloud. The watermark is set once and never cleared.
  if (inputs.offlineGraceExhaustedAt) {
    return {
      phase: 'OFFLINE_LIMIT_EXCEEDED',
      daysSinceVerification: 0,
      entitlement: inputs.entitlement,
      offlineSince: null,
      lastVerifiedAt: inputs.lastVerifiedAt,
      daysUntilLimit: 0,
      canSell: false,
      canReceiveStock: false,
      canViewReports: false,
    }
  }

  return computeOfflineState({
    shopId: inputs.shopId,
    isOnline: inputs.isOnline,
    lastVerifiedAt: inputs.lastVerifiedAt,
    entitlement: inputs.entitlement,
    primaryLost: inputs.primaryLost ?? false,
    subscriptionExpired: inputs.subscriptionExpired ?? false,
    offlineSince: inputs.offlineSince ?? null,
    now: inputs.now ?? new Date(nowMs),
  })
}

/** Locked constant — only place to read the threshold. */
export const DESKTOP_OFFLINE_GRACE_DAYS = OFFLINE_GRACE_DAYS