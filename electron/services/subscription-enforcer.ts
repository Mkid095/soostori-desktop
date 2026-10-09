/**
 * subscription-enforcer.ts — Subscription status check + POS enforcement gate.
 * P1-5 adds ClockTamperingError guard. P0-2d switches to canonical 5-state
 * (ACTIVE | SETUP_GRACE | EXPIRED | RENEWAL_GRACE | DEACTIVATED) from
 * `canonical/subscription-state`. The 4-state lowercase vocabulary is gone.
 * File split: cloud-fetcher / state-refresher / enforcer-messages / monotonic-clock.
 */

import { getSyncStore } from './store'
import { refreshState } from './subscription-state-refresher'
import { assertClockNotTampered, ClockTamperingError } from './canonical/monotonic-clock'
import {
  SubscriptionDeactivatedError,
  type SubscriptionStatus,
} from './canonical/subscription-state'
import {
  buildExpiredMessage,
  buildDeactivatedMessage,
  buildUnknownStateMessage,
} from './subscription-enforcer-messages'
import log from 'electron-log'

export interface SubscriptionState {
  valid: boolean
  expiresAt: string | null
  plan: string | null
  deviceLimit: number | null
  daysUntilExpiry: number | null
  isExpired: boolean
  isInGracePeriod: boolean
  graceDaysRemaining: number
  source: 'cloud' | 'cache' | 'default'
  checkedAt: string
  /** Canonical 5-state (P0-2d). Authoritative for decision logic. */
  canonicalStatus: SubscriptionStatus
  /** ISO 8601 or null. Set only on the first payment cycle in the canonical model. */
  setupGraceEndsAt: string | null
}

export { ClockTamperingError }

/** Re-exported for callers that want to match against the user-specified
 * vocabulary. Same as `canonical/subscription-state`'s `SubscriptionStatus`,
 * but kept here so existing call sites
 * (`electron/services/sync-timer-worker.ts:checkCloudSubscription`)
 * don't need to import from `canonical/` directly. */
export type CloudSubscriptionStatus = SubscriptionStatus

let _state: SubscriptionState | null = null
let _lastCheck = 0
let _checkInterval: ReturnType<typeof setInterval> | null = null

/** Get cached subscription status (no network call). */
export function getSubscriptionState(): SubscriptionState | null {
  return _state
}

/**
 * Lightweight subscription status check for the sync timer path.
 * Returns the canonical 5-state uppercase vocabulary.
 */
export function checkCloudSubscription(): {
  status: CloudSubscriptionStatus
  expiresAt: string | null
  plan: string
} {
  const state = _state
  if (!state) {
    // Pre-init: default to ACTIVE so the renderer doesn't briefly block
    // sales before the first cloud refresh resolves.
    return { status: 'ACTIVE', expiresAt: null, plan: '' }
  }
  return {
    status: state.canonicalStatus,
    expiresAt: state.expiresAt,
    plan: state.plan ?? '',
  }
}

/** Start background subscription check (every hour). */
export function startSubscriptionEnforcer(shopId: string): void {
  if (_checkInterval) return
  refreshState(shopId)
    .then((s) => { _state = s })
    .catch((err) => { log.warn('SubscriptionEnforcer: initial refresh failed:', err) })
  _checkInterval = setInterval(() => {
    refreshState(shopId)
      .then((s) => { _state = s })
      .catch((err) => { log.warn('SubscriptionEnforcer: hourly refresh failed:', err) })
  }, 60 * 60 * 1000)
  _lastCheck = Date.now()
  log.info('SubscriptionEnforcer: started')
}

export function stopSubscriptionEnforcer(): void {
  if (_checkInterval) { clearInterval(_checkInterval); _checkInterval = null }
  log.info('SubscriptionEnforcer: stopped')
}

/** Force a re-check (used by UI). */
export async function recheckSubscription(shopId: string): Promise<SubscriptionState> {
  const next = await refreshState(shopId)
  _state = next
  return next
}

/** Mark current check as successful — resets grace period clock. */
export function markSubscriptionSuccess(): void {
  const store = getSyncStore()
  store.set('subscriptionLastSuccess', new Date().toISOString())
}

/**
 * P0-2d: decision uses the canonical 5-state.
 *   ACTIVE | SETUP_GRACE | RENEWAL_GRACE → allow
 *   EXPIRED → throw Error (renewal grace exhausted)
 *   DEACTIVATED → throw SubscriptionDeactivatedError
 * Also throws ClockTamperingError if the system clock has been rolled back
 * past the persisted first-launch timestamp (P1-5).
 */
export function enforceSubscriptionOrThrow(): void {
  // P1-5: detect clock manipulation BEFORE evaluating the grace window.
  assertClockNotTampered()

  const state = _state
  if (!state) return

  if (state.canonicalStatus === 'ACTIVE' || state.canonicalStatus === 'SETUP_GRACE') {
    return
  }

  if (state.canonicalStatus === 'RENEWAL_GRACE') {
    log.warn(`SubscriptionEnforcer: RENEWAL_GRACE (${state.graceDaysRemaining}d remaining) — sales allowed with warning`)
    return
  }

  if (state.canonicalStatus === 'EXPIRED') {
    throw new Error(buildExpiredMessage(state.expiresAt))
  }

  if (state.canonicalStatus === 'DEACTIVATED') {
    throw new SubscriptionDeactivatedError(buildDeactivatedMessage())
  }

  throw new Error(buildUnknownStateMessage(state.canonicalStatus))
}
