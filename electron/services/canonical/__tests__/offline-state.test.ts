/**
 * Offline state — canonical contract tests.
 *
 * Phase 11.2 Batch D: locks the offline policy state machine on
 * @soostori/offline.computeOfflineState. Verifies bit-for-bit preservation
 * of the existing Desktop 3-day / 7-day grace rules.
 *
 * Run with:   npx tsx electron/services/canonical/__tests__/offline-state.test.ts
 */

import { asShopId } from '@soostori/core'
import { computeDesktopOfflineState, DESKTOP_OFFLINE_GRACE_DAYS } from '../offline-state'

let passed = 0
let failed = 0

function assert(name: string, cond: boolean): void {
  if (cond) { console.log(`  ✓ ${name}`); passed++ }
  else { console.log(`  ✗ ${name}`); failed++ }
}

async function run(): Promise<void> {
  console.log('\n=== Phase 11.2 Batch D offline-state contract tests ===\n')

  const shopId = asShopId('shop-1')
  const now = new Date('2026-09-05T00:00:00Z')
  const lastVer = new Date(now.getTime() - 1000).toISOString()

  // [1] Locked grace is 3 days.
  assert('[1] OFFLINE_GRACE_DAYS = 3', DESKTOP_OFFLINE_GRACE_DAYS === 3)

  // [2] Online + just verified → ONLINE phase.
  {
    const state = computeDesktopOfflineState({
      shopId,
      isOnline: true,
      lastVerifiedAt: lastVer,
      entitlement: null,
      now,
    })
    assert('[2] online+recent → ONLINE', state.phase === 'ONLINE')
    assert('[2] online has canSell=true', state.canSell === true)
  }

  // [3] Offline < 1 day → OFFLINE_NORMAL.
  {
    const lastVerOffline = new Date(now.getTime() - 12 * 3600 * 1000).toISOString()
    const state = computeDesktopOfflineState({
      shopId,
      isOnline: false,
      lastVerifiedAt: lastVerOffline,
      entitlement: null,
      now,
    })
    assert('[3] offline < 1 day → OFFLINE_NORMAL', state.phase === 'OFFLINE_NORMAL')
  }

  // [4] Offline ≥ 2 days (< 3) → OFFLINE_WARNING.
  {
    const lastVerWarning = new Date(now.getTime() - 48 * 3600 * 1000).toISOString()
    const state = computeDesktopOfflineState({
      shopId,
      isOnline: false,
      lastVerifiedAt: lastVerWarning,
      entitlement: null,
      now,
    })
    assert('[4] offline 2 days → OFFLINE_WARNING', state.phase === 'OFFLINE_WARNING')
    assert('[4] warning preserves canSell=true', state.canSell === true)
  }

  // [5] Offline ≥ 3 days → OFFLINE_LIMIT_EXCEEDED, canSell=false.
  {
    const lastVerExpired = new Date(now.getTime() - 96 * 3600 * 1000).toISOString()
    const state = computeDesktopOfflineState({
      shopId,
      isOnline: false,
      lastVerifiedAt: lastVerExpired,
      entitlement: null,
      now,
    })
    assert('[5] offline ≥ 3 days → OFFLINE_LIMIT_EXCEEDED', state.phase === 'OFFLINE_LIMIT_EXCEEDED')
    assert('[5] canSell=false when limit exceeded', state.canSell === false)
    assert('[5] daysUntilLimit = 0', state.daysUntilLimit === 0)
  }

  // [6] Subscription expired + 3+ days offline → OFFLINE_LIMIT_EXCEEDED.
  {
    const lastVerExpired = new Date(now.getTime() - 96 * 3600 * 1000).toISOString()
    const state = computeDesktopOfflineState({
      shopId,
      isOnline: false,
      lastVerifiedAt: lastVerExpired,
      entitlement: null,
      subscriptionExpired: true,
      now,
    })
    assert('[6] subscription expired + 3+ days → OFFLINE_LIMIT_EXCEEDED', state.phase === 'OFFLINE_LIMIT_EXCEEDED')
  }

  // [7] Subscription expired but recent (within grace) → still normal/warning window.
  {
    const lastVerRecent = new Date(now.getTime() - 6 * 3600 * 1000).toISOString()
    const state = computeDesktopOfflineState({
      shopId,
      isOnline: false,
      lastVerifiedAt: lastVerRecent,
      entitlement: null,
      subscriptionExpired: true,
      now,
    })
    assert('[7] subscription expired but recent → OFFLINE_NORMAL', state.phase === 'OFFLINE_NORMAL')
  }

  console.log(`\nTotal: ${passed} passed, ${failed} failed`)
  process.exit(failed === 0 ? 0 : 1)
}

run().catch((err: unknown) => {
  console.error('test runner failed:', err)
  process.exit(2)
})
