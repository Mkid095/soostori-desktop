/**
 * Subscription state — canonical Desktop adapter.
 *
 * Phase 11.2 Batch D: routes Desktop's hand-rolled subscription enforcer
 * through the published @soostori/subscription helpers. Existing 7-day
 * grace period plus "expired → read-only" rule is preserved.
 */

import { enforceSubscription as sdkEnforceSubscription, type SubscriptionState } from '@soostori/subscription'
import { defaultEntitlement as sdkDefaultEntitlement } from '@soostori/subscription'
import type { SubscriptionEntitlement } from '@soostori/core'

export type { SubscriptionState }

export function desktopDefaultEntitlement(shopId: string): SubscriptionEntitlement {
  return sdkDefaultEntitlement(shopId)
}

export function enforceSubscription(state: SubscriptionState): void {
  // Delegates bit-for-bit to the SDK. The Desktop's 7-day grace logic is
  // encoded in SubscriptionState computed upstream; enforcement here is
  // a single decision point.
  sdkEnforceSubscription(state)
}
