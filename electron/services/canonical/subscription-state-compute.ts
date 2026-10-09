/**
 * subscription-state-compute.ts — 5-state classifier and legacy bridge.
 *
 * Extracted from `canonical/subscription-state.ts` to keep that file
 * under the ANPAS 150-line limit. Pure functions only — no Electron
 * dependencies, no side effects, safe to unit-test without booting
 * the runtime.
 *
 * Phase 5B P0-2d: the canonical 5-state vocabulary, until the SDK ships it.
 */

const DAY_MS = 24 * 60 * 60 * 1000

export type SubscriptionStatus =
  | 'ACTIVE'
  | 'SETUP_GRACE'
  | 'EXPIRED'
  | 'RENEWAL_GRACE'
  | 'DEACTIVATED'

/** First-month setup grace (admin-configurable in P2-2). */
export const SETUP_GRACE_DAYS_DEFAULT = 14

/** Fixed subscription period. */
export const SUBSCRIPTION_PERIOD_DAYS_DEFAULT = 30

/** Post-expiry renewal grace. */
export const RENEWAL_GRACE_DAYS_DEFAULT = 3

export interface ComputeSubscriptionStateInput {
  currentPeriodEnd: string | null
  setupGraceEndsAt: string | null
  now?: Date
}

/**
 * Pure classifier — returns the canonical 5-state from a cloud row.
 *
 * Resolution order:
 *   1. `setupGraceEndsAt` in the future → SETUP_GRACE
 *   2. `currentPeriodEnd` in the future or now → ACTIVE
 *   3. `currentPeriodEnd` within RENEWAL_GRACE_DAYS_DEFAULT → RENEWAL_GRACE
 *   4. Otherwise → DEACTIVATED
 *
 * `EXPIRED` is returned only when explicitly synthesised by the caller
 * (e.g. status='past_due' with long-overdue period end). This function
 * never returns `EXPIRED`; callers may overwrite with `EXPIRED` based
 * on a legacy `status` field.
 */
export function computeSubscriptionState(
  input: ComputeSubscriptionStateInput,
): SubscriptionStatus {
  const now = (input.now ?? new Date()).getTime()

  if (input.setupGraceEndsAt) {
    const setupEnd = new Date(input.setupGraceEndsAt).getTime()
    if (now < setupEnd) return 'SETUP_GRACE'
  }

  if (!input.currentPeriodEnd) {
    return 'DEACTIVATED'
  }

  const periodEnd = new Date(input.currentPeriodEnd).getTime()
  if (now <= periodEnd) return 'ACTIVE'

  const graceMs = RENEWAL_GRACE_DAYS_DEFAULT * DAY_MS
  if (now - periodEnd <= graceMs) return 'RENEWAL_GRACE'

  return 'DEACTIVATED'
}

/**
 * Map a legacy cloud lowercase `status` value to the canonical 5-state.
 * Handles all five legacy values plus the common `active` and `trialing`.
 */
export function mapCloudStatusToCanonical(
  cloudStatus: string | null | undefined,
  fallback: SubscriptionStatus,
): SubscriptionStatus {
  switch (cloudStatus) {
    case 'active':
    case 'trialing':
      return 'ACTIVE'
    case 'past_due':
      return 'RENEWAL_GRACE'
    case 'expired':
      return 'EXPIRED'
    case 'cancelled':
    case 'deactivated':
      return 'DEACTIVATED'
    default:
      return fallback
  }
}

/** True if the canonical state allows POS mutations. */
export function canonicalIsStatusActive(status: SubscriptionStatus): boolean {
  return status === 'ACTIVE' || status === 'SETUP_GRACE' || status === 'RENEWAL_GRACE'
}
