/**
 * subscription-state.ts — Desktop canonical subscription contract.
 *
 * Phase 5B P0-2d: introduces the user-specified 5-state subscription
 * vocabulary to Desktop. The current published SDK
 * (`@soostori/subscription@0.1.0-alpha.5`, `@soostori/core@0.1.0-alpha.13`)
 * still uses the legacy 5-value lowercase enum
 * (`active | past_due | expired | cancelled | trialing`); the audit-promised
 * uppercase 5-state enum is not yet shipped. This file is the
 * Desktop-owned canonical contract so the enforcer can adopt the
 * user-spec vocabulary without waiting for the SDK to publish alpha.6.
 *
 * When the SDK ships `SETUP_GRACE_DAYS`, `SUBSCRIPTION_PERIOD_DAYS`,
 * `RENEWAL_GRACE_DAYS`, and a 5-state uppercase `SubscriptionStatus`,
 * replace the local definitions with re-exports from the SDK and
 * the consumers should import directly from the SDK.
 *
 * Locked business rules:
 *   - 14-day first-month setup grace (admin-configurable in future P2-2)
 *   - 30-day fixed subscription period
 *   - 3-day renewal grace
 *   - 5 distinct states: ACTIVE | SETUP_GRACE | EXPIRED | RENEWAL_GRACE | DEACTIVATED
 *   - Mutations allowed in ACTIVE | SETUP_GRACE | RENEWAL_GRACE
 *   - Mutations blocked in EXPIRED | DEACTIVATED
 */

// Re-export the 5-state contract from its compute module (pure, no SDK).
export {
  computeSubscriptionState,
  mapCloudStatusToCanonical,
  canonicalIsStatusActive,
  SETUP_GRACE_DAYS_DEFAULT,
  SUBSCRIPTION_PERIOD_DAYS_DEFAULT,
  RENEWAL_GRACE_DAYS_DEFAULT,
  type ComputeSubscriptionStateInput,
  type SubscriptionStatus,
} from './subscription-state-compute'

// Re-export the Desktop-specific error class.
export { SubscriptionDeactivatedError } from './subscription-errors'

/**
 * Desktop default trial entitlement — delegates to SDK's `defaultEntitlement`
 * with a Desktop-flavored 14-day setup grace (matching SETUP_GRACE_DAYS_DEFAULT).
 * Preserved from Phase 11.2 Batch D for the canonical smoke test.
 *
 * Uses dynamic import so this file has no SDK value imports at module-load
 * (lets unit tests import the pure 5-state contract without dragging in
 * the ESM `@soostori/subscription` chain).
 */
export async function desktopDefaultEntitlement(shopId: string): Promise<unknown> {
  const sdk = await import('@soostori/subscription')
  return sdk.defaultEntitlement(shopId)
}
