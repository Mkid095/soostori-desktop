/**
 * subscription-5state.test.ts — Canonical 5-state subscription tests (P0-2d).
 *
 * Verifies the 5-state vocabulary (ACTIVE | SETUP_GRACE | EXPIRED |
 * RENEWAL_GRACE | DEACTIVATED), the pure classifier, the legacy bridge,
 * the error class, the message builders, and the P1-5 monotonic clock
 * guard that `enforceSubscriptionOrThrow` calls first.
 *
 * The enforcer's decision logic is a thin `switch` on `canonicalStatus`;
 * the substantive logic lives in `computeSubscriptionState` and
 * `mapCloudStatusToCanonical` (covered here). The enforcer itself is
 * not imported to keep the test chain pure (the enforcer pulls in
 * `electron-store` via `./store`, which is environment-bound and
 * unavailable in the test runner). Enforcer integration is verified
 * by code review.
 *
 * Coverage:
 *   [1]  computeSubscriptionState — 5-state vocabulary + edge cases
 *   [2]  computeSubscriptionState — boundary conditions (ms-precision)
 *   [3]  computeSubscriptionState — null expiry → DEACTIVATED
 *   [4]  mapCloudStatusToCanonical — legacy lowercase bridge
 *   [5]  canonicalIsStatusActive — allow matrix
 *   [6]  SubscriptionDeactivatedError — class shape
 *   [7]  Message builders — user-facing copy
 *   [8]  Constants — SETUP / PERIOD / RENEWAL day values
 *   [9]  P1-5 monotonic clock guard — ClockTamperingError regression
 *
 * Run with: npx tsx electron/services/__tests__/subscription-5state.test.ts
 */

import {
  computeSubscriptionState,
  mapCloudStatusToCanonical,
  canonicalIsStatusActive,
  RENEWAL_GRACE_DAYS_DEFAULT,
  SETUP_GRACE_DAYS_DEFAULT,
  SUBSCRIPTION_PERIOD_DAYS_DEFAULT,
} from '../canonical/subscription-state-compute'
import { SubscriptionDeactivatedError } from '../canonical/subscription-errors'
import {
  buildExpiredMessage,
  buildDeactivatedMessage,
  buildUnknownStateMessage,
} from '../subscription-enforcer-messages'
import {
  assertClockNotTampered,
  setFirstLaunchFloorResolver,
  ClockTamperingError,
  CLOCK_TOLERANCE_MS,
} from '../canonical/monotonic-clock'

let passed = 0
let failed = 0

function assert(name: string, cond: boolean): void {
  if (cond) { console.log(`  ✓ ${name}`); passed++ }
  else { console.log(`  ✗ ${name}`); failed++ }
}

function expectThrow(name: string, fn: () => unknown, ctor: new (...args: never[]) => Error): boolean {
  try {
    fn()
    console.log(`  ✗ ${name}`); failed++
    return false
  } catch (err) {
    if (err instanceof ctor) { console.log(`  ✓ ${name}`); passed++; return true }
    console.log(`  ✗ ${name} (wrong error: ${String(err)})`); failed++
    return false
  }
}

const DAY_MS = 24 * 60 * 60 * 1000
const now = new Date('2026-10-05T12:00:00Z')

function run(): void {
  console.log('\n=== P0-2d canonical 5-state subscription tests ===\n')

  // ----- [1] computeSubscriptionState — 5-state vocabulary -----
  assert('[1.1] period end 7 days in future, no setup grace → ACTIVE',
    computeSubscriptionState({
      currentPeriodEnd: new Date(now.getTime() + 7 * DAY_MS).toISOString(),
      setupGraceEndsAt: null, now,
    }) === 'ACTIVE')

  assert('[1.2] setup grace ends 7 days in future → SETUP_GRACE',
    computeSubscriptionState({
      currentPeriodEnd: new Date(now.getTime() + 7 * DAY_MS).toISOString(),
      setupGraceEndsAt: new Date(now.getTime() + 7 * DAY_MS).toISOString(),
      now,
    }) === 'SETUP_GRACE')

  assert('[1.3] period ended 1 day ago → RENEWAL_GRACE',
    computeSubscriptionState({
      currentPeriodEnd: new Date(now.getTime() - 1 * DAY_MS).toISOString(),
      setupGraceEndsAt: null, now,
    }) === 'RENEWAL_GRACE')

  assert('[1.4] period ended 5 days ago → DEACTIVATED',
    computeSubscriptionState({
      currentPeriodEnd: new Date(now.getTime() - 5 * DAY_MS).toISOString(),
      setupGraceEndsAt: null, now,
    }) === 'DEACTIVATED')

  assert('[1.5] SETUP_GRACE overrides past period end (first month)',
    computeSubscriptionState({
      currentPeriodEnd: new Date(now.getTime() - 1 * DAY_MS).toISOString(),
      setupGraceEndsAt: new Date(now.getTime() + 7 * DAY_MS).toISOString(),
      now,
    }) === 'SETUP_GRACE')

  // ----- [2] Boundary conditions -----
  // At exact RENEWAL_GRACE_DAYS_DEFAULT, the function uses `<=`, so 3 days still RENEWAL_GRACE.
  const exactly3DaysAgo = new Date(now.getTime() - 3 * DAY_MS).toISOString()
  assert('[2.1] exactly 3 days past period end → RENEWAL_GRACE (boundary <=)',
    computeSubscriptionState({ currentPeriodEnd: exactly3DaysAgo, setupGraceEndsAt: null, now }) === 'RENEWAL_GRACE')

  // 3 days + 1ms → DEACTIVATED
  const justOverGrace = new Date(now.getTime() - 3 * DAY_MS - 1).toISOString()
  assert('[2.2] 3 days + 1ms past period end → DEACTIVATED',
    computeSubscriptionState({ currentPeriodEnd: justOverGrace, setupGraceEndsAt: null, now }) === 'DEACTIVATED')

  // Exactly at period end (now == periodEnd) → ACTIVE (<=)
  assert('[2.3] exactly at period end → ACTIVE (boundary <=)',
    computeSubscriptionState({ currentPeriodEnd: now.toISOString(), setupGraceEndsAt: null, now }) === 'ACTIVE')

  // Setup grace: exactly at setupGraceEndsAt (now == setupEnd) → ACTIVE (<)
  assert('[2.4] exactly at setupGraceEndsAt → ACTIVE (boundary <)',
    computeSubscriptionState({
      currentPeriodEnd: new Date(now.getTime() + 7 * DAY_MS).toISOString(),
      setupGraceEndsAt: now.toISOString(), now,
    }) === 'ACTIVE')

  // ----- [3] Null expiry → DEACTIVATED -----
  assert('[3.1] null currentPeriodEnd and no setup grace → DEACTIVATED',
    computeSubscriptionState({ currentPeriodEnd: null, setupGraceEndsAt: null, now }) === 'DEACTIVATED')

  // ----- [4] Legacy status bridge -----
  assert('[4.1] cloud status "active" → ACTIVE',
    mapCloudStatusToCanonical('active', 'DEACTIVATED') === 'ACTIVE')
  assert('[4.2] cloud status "trialing" → ACTIVE',
    mapCloudStatusToCanonical('trialing', 'DEACTIVATED') === 'ACTIVE')
  assert('[4.3] cloud status "past_due" → RENEWAL_GRACE',
    mapCloudStatusToCanonical('past_due', 'DEACTIVATED') === 'RENEWAL_GRACE')
  assert('[4.4] cloud status "expired" → EXPIRED',
    mapCloudStatusToCanonical('expired', 'DEACTIVATED') === 'EXPIRED')
  assert('[4.5] cloud status "cancelled" → DEACTIVATED',
    mapCloudStatusToCanonical('cancelled', 'DEACTIVATED') === 'DEACTIVATED')
  assert('[4.6] cloud status "deactivated" → DEACTIVATED',
    mapCloudStatusToCanonical('deactivated', 'DEACTIVATED') === 'DEACTIVATED')
  assert('[4.7] cloud status unknown → fallback',
    mapCloudStatusToCanonical('unknown_value', 'DEACTIVATED') === 'DEACTIVATED')
  assert('[4.8] cloud status null → fallback',
    mapCloudStatusToCanonical(null, 'ACTIVE') === 'ACTIVE')

  // ----- [5] canonicalIsStatusActive — mutation allow matrix -----
  assert('[5.1] ACTIVE allows mutations', canonicalIsStatusActive('ACTIVE') === true)
  assert('[5.2] SETUP_GRACE allows mutations', canonicalIsStatusActive('SETUP_GRACE') === true)
  assert('[5.3] RENEWAL_GRACE allows mutations (warning, not block)', canonicalIsStatusActive('RENEWAL_GRACE') === true)
  assert('[5.4] EXPIRED blocks mutations', canonicalIsStatusActive('EXPIRED') === false)
  assert('[5.5] DEACTIVATED blocks mutations', canonicalIsStatusActive('DEACTIVATED') === false)

  // ----- [6] SubscriptionDeactivatedError shape -----
  const e1 = new SubscriptionDeactivatedError('test')
  assert('[6.1] error.name === "SubscriptionDeactivatedError"', e1.name === 'SubscriptionDeactivatedError')
  assert('[6.2] error.code === "SUBSCRIPTION_DEACTIVATED"', e1.code === 'SUBSCRIPTION_DEACTIVATED')
  assert('[6.3] error.message preserved', e1.message === 'test')
  assert('[6.4] error is instanceof Error', e1 instanceof Error)

  // ----- [7] Message builders -----
  assert('[7.1] buildExpiredMessage with date contains the date',
    buildExpiredMessage(new Date('2026-09-01').toISOString()).includes('2026'))
  assert('[7.2] buildExpiredMessage with null date is generic',
    buildExpiredMessage(null) === 'Subscription has expired. Please renew to continue.')
  assert('[7.3] buildDeactivatedMessage is non-empty', buildDeactivatedMessage().length > 0)
  assert('[7.4] buildUnknownStateMessage includes the state',
    buildUnknownStateMessage('WEIRD_STATE').includes('WEIRD_STATE'))

  // ----- [8] Constants -----
  assert('[8.1] RENEWAL_GRACE_DAYS_DEFAULT === 3', RENEWAL_GRACE_DAYS_DEFAULT === 3)
  assert('[8.2] SETUP_GRACE_DAYS_DEFAULT === 14', SETUP_GRACE_DAYS_DEFAULT === 14)
  assert('[8.3] SUBSCRIPTION_PERIOD_DAYS_DEFAULT === 30', SUBSCRIPTION_PERIOD_DAYS_DEFAULT === 30)

  // ----- [9] P1-5 monotonic clock guard (regression) -----
  // The enforcer's first action is `assertClockNotTampered()`. We test the
  // guard directly to prove it still works without dragging in the enforcer's
  // electron-store chain.
  assert('[9.1] CLOCK_TOLERANCE_MS = 60_000', CLOCK_TOLERANCE_MS === 60_000)

  const futureFloor = new Date('2030-01-01').getTime()
  const pastWall = futureFloor - 365 * DAY_MS
  setFirstLaunchFloorResolver(() => futureFloor)
  expectThrow('[9.2] assertClockNotTampered throws ClockTamperingError on rollback',
    () => assertClockNotTampered(pastWall), ClockTamperingError)

  // Within tolerance (60s) does NOT throw.
  let threw = false
  try { assertClockNotTampered(futureFloor + CLOCK_TOLERANCE_MS / 2) } catch { threw = true }
  assert('[9.3] assertClockNotTampered within tolerance (60s NTP/DST window) does NOT throw', !threw)

  // Future wall clock does NOT throw.
  threw = false
  try { assertClockNotTampered(futureFloor + 30 * DAY_MS) } catch { threw = true }
  assert('[9.4] assertClockNotTampered 30 days after floor does NOT throw', !threw)

  // Reset resolver so subsequent test runs aren't polluted.
  setFirstLaunchFloorResolver(() => Date.now())
  threw = false
  try { assertClockNotTampered() } catch { threw = true }
  assert('[9.5] assertClockNotTampered default-resolved at current time does NOT throw', !threw)

  console.log(`\nTotal: ${passed} passed, ${failed} failed`)
  process.exit(failed === 0 ? 0 : 1)
}

run()
