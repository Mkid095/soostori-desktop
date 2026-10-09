/**
 * subscription-clock-guard.test.ts — Monotonic clock guard tests (P1-5).
 *
 * Verifies the shared `monotonic-clock` helper that protects both
 * `subscription-enforcer.ts` and `canonical/offline-state.ts` from
 * wall-clock rollback attacks. Pure module: no electron-store load.
 *
 * Run with:   npx tsx electron/services/__tests__/subscription-clock-guard.test.ts
 */

import {
  ClockTamperingError,
  assertClockNotTampered,
  assertClockNotTamperedWith,
  isClockTampered,
  monotonicElapsedMs,
  setFirstLaunchFloorResolver,
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

function run(): void {
  console.log('\n=== P1-5 monotonic clock guard tests ===\n')

  const futureFloor = new Date('2030-01-01T00:00:00Z').getTime()
  const pastWall = futureFloor - 365 * 24 * 3600 * 1000 // 1 year before floor

  // [1] Constants.
  assert('[1] CLOCK_TOLERANCE_MS = 60_000', CLOCK_TOLERANCE_MS === 60_000)

  // [2] Pure check: clock far before floor is tampered.
  assert('[2] isClockTampered: 1 year before floor → true',
    isClockTampered(pastWall, futureFloor) === true)

  // [3] Pure check: clock at floor + tolerance is NOT tampered.
  const justInside = futureFloor + CLOCK_TOLERANCE_MS / 2
  assert('[3] isClockTampered: inside tolerance window → false',
    isClockTampered(justInside, futureFloor) === false)

  // [4] Pure check: clock advanced beyond floor is NOT tampered.
  const advanced = futureFloor + 30 * 24 * 3600 * 1000
  assert('[4] isClockTampered: 30 days after floor → false',
    isClockTampered(advanced, futureFloor) === false)

  // [5] Pure assertion: throws ClockTamperingError when tampered.
  expectThrow('[5] assertClockNotTamperedWith throws ClockTamperingError on rollback',
    () => assertClockNotTamperedWith(pastWall, futureFloor), ClockTamperingError)

  // [6] Pure assertion: does NOT throw when within tolerance.
  let threw = false
  try { assertClockNotTamperedWith(justInside, futureFloor) } catch { threw = true }
  assert('[6] assertClockNotTamperedWith does NOT throw within tolerance', !threw)

  // [7] ClockTamperingError carries diagnostic context.
  try {
    assertClockNotTamperedWith(pastWall, futureFloor)
  } catch (err) {
    assert('[7] error.name === "ClockTamperingError"', (err as Error).name === 'ClockTamperingError')
    const tamper = err as ClockTamperingError
    assert('[7] error.code === "CLOCK_TAMPERING_DETECTED"', tamper.code === 'CLOCK_TAMPERING_DETECTED')
    assert('[7] error.wallClockMs preserved', tamper.wallClockMs === pastWall)
    assert('[7] error.firstLaunchMs preserved', tamper.firstLaunchMs === futureFloor)
    assert('[7] error.message mentions both timestamps',
      tamper.message.includes(new Date(pastWall).toISOString()) &&
      tamper.message.includes(new Date(futureFloor).toISOString()))
  }

  // [8] Resolver-driven no-arg form: floor comes from the configured resolver.
  setFirstLaunchFloorResolver(() => futureFloor)
  expectThrow('[8] assertClockNotTampered() throws when resolver floor says tampered',
    () => assertClockNotTampered(pastWall), ClockTamperingError)

  // [9] Resolver-driven no-arg form: does NOT throw when within tolerance.
  threw = false
  try { assertClockNotTampered(justInside) } catch { threw = true }
  assert('[9] assertClockNotTampered() OK within tolerance', !threw)

  // [10] Resolver-driven no-arg form: uses default floor (Date.now()) when no resolver set.
  //       Reset by passing null — module exposes only setter, so we test with resolver
  //       returning a known future time and wall clock at Date.now() (always after).
  setFirstLaunchFloorResolver(() => Date.now() - 1000) // floor 1s ago
  expectThrow('[10] assertClockNotTampered() throws when wall clock is before resolver floor',
    () => assertClockNotTampered(Date.now() - 365 * 24 * 3600 * 1000), ClockTamperingError)

  // [11] Monotonic elapsed time is non-negative and increasing.
  const t0 = monotonicElapsedMs()
  // busy-wait to let monotonic time advance
  const waitStart = Date.now();
  while (Date.now() - waitStart < 5) { /* spin */ }
  const t1 = monotonicElapsedMs()
  assert('[11] monotonicElapsedMs() is non-negative', t0 >= 0)
  assert('[11] monotonicElapsedMs() is strictly increasing under busy-wait', t1 > t0)

  // [12] Reset resolver to identity (Date.now()) so subsequent tests aren't polluted.
  setFirstLaunchFloorResolver(() => Date.now())
  threw = false
  try { assertClockNotTampered() } catch { threw = true }
  assert('[12] Default-resolved assertClockNotTampered() OK at current time', !threw)

  console.log(`\nTotal: ${passed} passed, ${failed} failed`)
  process.exit(failed === 0 ? 0 : 1)
}

run()