/**
 * subscription-errors.ts — Desktop-specific subscription error classes.
 *
 * Extracted from `canonical/subscription-state.ts` to avoid a transitive
 * `@soostori/subscription` import in callers (and tests) that only need
 * the error type. Pure local — no SDK, no Electron, no side effects.
 */

/**
 * Mirrors SDK's `SubscriptionExpiredError` for the DEACTIVATED state.
 * P0-2d addition: distinct error class so callers can branch on
 * `err instanceof SubscriptionDeactivatedError` vs generic `Error`.
 */
export class SubscriptionDeactivatedError extends Error {
  readonly code = 'SUBSCRIPTION_DEACTIVATED' as const
  constructor(message: string) {
    super(message)
    this.name = 'SubscriptionDeactivatedError'
  }
}
