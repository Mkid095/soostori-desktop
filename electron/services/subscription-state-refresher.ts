/**
 * subscription-state-refresher.ts — Refresh subscription state from cloud or cache.
 *
 * Extracted from subscription-enforcer.ts to keep that file under the
 * ANPAS 150-line limit. All wall-clock reads here go through
 * `assertClockNotTampered()` to defeat clock-rollback attacks.
 *
 * Phase 5B P0-2d: replaces the local `GRACE_PERIOD_DAYS = 3` constant
 * with the canonical `RENEWAL_GRACE_DAYS_DEFAULT` from
 * `canonical/subscription-state`, and populates the `canonicalStatus`
 * field using the 5-state classifier. Legacy cloud lowercase `status`
 * values (past_due, cancelled, expired, trialing, active) are mapped
 * to the canonical 5-state uppercase enum.
 */

import log from 'electron-log'
import { getSyncStore } from './store'
import { fetchCloudSubscription } from './subscription-cloud-fetcher'
import { assertClockNotTampered } from './canonical/monotonic-clock'
import { OFFLINE_GRACE_DAYS } from '@soostori/core'
import {
  RENEWAL_GRACE_DAYS_DEFAULT,
  computeSubscriptionState,
  mapCloudStatusToCanonical,
  type SubscriptionStatus,
} from './canonical/subscription-state'
import type { SubscriptionState } from './subscription-enforcer'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Compute a fresh SubscriptionState by attempting cloud fetch then falling
 * back to cache. Throws ClockTamperingError if the wall clock is rolled back
 * past the persisted first-launch timestamp.
 */
export async function refreshState(shopId: string): Promise<SubscriptionState> {
  const now = Date.now()
  assertClockNotTampered(now)
  const store = getSyncStore()

  // P1-05: If the offline grace was already exhausted, keep the watermark
  // intact — the device stays blocked regardless of reconnect. Do not
  // refresh subscriptionCheckedAt here because that would reset lastVerifiedAt
  // and give the device a fresh 3-day grace window.
  const existingExhausted = store.get('offlineGraceExhaustedAt') as string | null | undefined
  if (existingExhausted) {
    // Grace already exhausted — skip subscriptionCheckedAt refresh
  }

  let cloudSub: Awaited<ReturnType<typeof fetchCloudSubscription>> | null = null
  try {
    cloudSub = await fetchCloudSubscription(shopId)
    log.info(`Subscription cloud check: plan=${cloudSub.plan}, expires=${cloudSub.expiryDate}, status=${cloudSub.status}`)
    store.set('subscription', JSON.stringify(cloudSub))

    // P1-05: Only refresh lastVerifiedAt (via subscriptionCheckedAt) when
    // the offline grace is NOT yet exhausted. Once it is exhausted, keep the
    // original exhausted timestamp so the grace period never resets.
    if (!existingExhausted) {
      // Check if this reconnect just exhausted the grace for the first time.
      // We compute graceRemaining using the existing lastVerifiedAt so we can
      // detect the moment it hits 0.
      const lastVerifiedAt = (store.get('subscriptionCheckedAt') as string | undefined) ?? new Date(0).toISOString()
      const graceElapsed = Math.floor((now - new Date(lastVerifiedAt).getTime()) / DAY_MS)
      const graceRemaining = Math.max(0, OFFLINE_GRACE_DAYS - graceElapsed)

      if (graceRemaining > 0) {
        // Grace still intact — refresh the verification timestamp normally
        store.set('subscriptionCheckedAt', new Date(now).toISOString())
      } else {
        // Grace just hit 0 — persist the exhaustion watermark and do NOT
        // refresh subscriptionCheckedAt (lastVerifiedAt stays at the moment
        // of exhaustion, so offline state correctly shows blocked).
        store.set('offlineGraceExhaustedAt', new Date(now).toISOString())
      }
    }
  } catch (err) {
    log.warn('Subscription cloud check failed:', err)
    // P1-05: On failure also skip refreshing subscriptionCheckedAt if grace
    // is already exhausted (same reasoning as the success path above).
  }

  const expiresAt = cloudSub?.expiryDate ?? null
  const plan = cloudSub?.plan ?? null
  const deviceLimit = cloudSub?.deviceLimit ?? null
  const setupGraceEndsAt = cloudSub?.setupGraceEndsAt ?? null

  let daysUntilExpiry: number | null = null
  let isExpired = false
  if (expiresAt) {
    const expiry = new Date(expiresAt).getTime()
    daysUntilExpiry = Math.floor((expiry - now) / DAY_MS)
    isExpired = expiry < now
  }

  const lastSuccessAt = (store.get('subscriptionLastSuccess') as string | undefined) ?? null
  let graceDaysRemaining = RENEWAL_GRACE_DAYS_DEFAULT
  if (lastSuccessAt) {
    const elapsed = Math.floor((now - new Date(lastSuccessAt).getTime()) / DAY_MS)
    graceDaysRemaining = Math.max(0, RENEWAL_GRACE_DAYS_DEFAULT - elapsed)
  }

  const source: SubscriptionState['source'] = cloudSub ? 'cloud' : (lastSuccessAt ? 'cache' : 'default')
  const valid = !!cloudSub || (!isExpired && graceDaysRemaining > 0)
  const isInGracePeriod = !cloudSub && !isExpired && graceDaysRemaining > 0

  // Compute canonical 5-state from the dates — this is the user-specified
  // vocabulary that the enforcer and renderer both speak.
  const computed: SubscriptionStatus = computeSubscriptionState({
    currentPeriodEnd: expiresAt,
    setupGraceEndsAt,
    now: new Date(now),
  })

  // For legacy cloud rows, the lowercased `status` field is authoritative —
  // it represents an explicit business decision (e.g. 'cancelled' even when
  // the date is in the future). Use it as a fallback when it disagrees.
  const canonicalStatus: SubscriptionStatus = cloudSub
    ? mapCloudStatusToCanonical(cloudSub.status, computed)
    : computed

  return {
    valid,
    expiresAt,
    plan,
    deviceLimit,
    daysUntilExpiry,
    isExpired,
    isInGracePeriod,
    graceDaysRemaining,
    source,
    checkedAt: new Date(now).toISOString(),
    canonicalStatus,
    setupGraceEndsAt,
  }
}
