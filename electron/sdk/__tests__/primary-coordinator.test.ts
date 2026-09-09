/**
 * PrimaryDeviceCoordinator Desktop adapter — SDK contract verification.
 *
 * Validates that the canonical @soostori/devices.PrimaryDeviceCoordinator
 * instance behaves correctly when wired through Desktop's exported accessors.
 *
 * Phase 11.2 acceptance test: identical state transitions and threshold
 * semantics to the prior duplicate inline getPrimaryStatus implementations.
 *
 * Run with:   npx tsx electron/sdk/__tests__/primary-coordinator.test.ts
 */

import {
  initPrimaryCoordinator,
  setHostMode,
  ingestPrimaryHeartbeat,
  tickPrimaryCoordinator,
  getPrimaryStatus,
  getAuthorityStatus,
  PRIMARY_THRESHOLDS,
} from '../primary-coordinator'

let passed = 0
let failed = 0

function assert(name: string, cond: boolean): void {
  if (cond) { console.log(`  ✓ ${name}`); passed++ }
  else { console.log(`  ✗ ${name}`); failed++ }
}

async function run(): Promise<void> {
  console.log('\n=== Phase 11.2 PrimaryDeviceCoordinator canonicalization tests ===\n')

  // [1] Threshold constants match prior values — the LOCK values.
  assert('[1] STALE_THRESHOLD_MS = 15_000', PRIMARY_THRESHOLDS.STALE_MS === 15_000)
  assert('[1] LOST_THRESHOLD_MS = 60_000', PRIMARY_THRESHOLDS.LOST_MS === 60_000)

  // [2] Before init: UNKNOWN / denied
  assert('[2] pre-init status = unknown', getAuthorityStatus() === 'unknown')
  assert('[2] pre-init canAuthorStockOps = false', getPrimaryStatus().canAuthorStockOps === false)

  // [3] Init with local as a non-host terminal; elect the remote as primary.
  {
    initPrimaryCoordinator({ shopId: 'shop-test', deviceId: 'dev-local' })
    setHostMode(false)
    ingestPrimaryHeartbeat('host-device-1', Date.now())
    tickPrimaryCoordinator()
    assert('[3] client+fresh heartbeat status = online', getAuthorityStatus() === 'online')
    assert('[3] client+fresh heartbeat canAuthor=true', getPrimaryStatus().canAuthorStockOps === true)
  }

  // [4] STALE: 20s-old heartbeat → STALE / denied
  {
    ingestPrimaryHeartbeat('host-device-1', Date.now() - 20_000)
    tickPrimaryCoordinator()
    assert('[4] 20s-old heartbeat status = stale', getAuthorityStatus() === 'stale')
    assert('[4] 20s-old heartbeat canAuthor=false', getPrimaryStatus().canAuthorStockOps === false)
  }

  // [5] Refresh → ONLINE, then 65s-old → LOST (SDK requires ONLINE→LOST direct edge).
  {
    ingestPrimaryHeartbeat('host-device-1', Date.now())
    tickPrimaryCoordinator()
    assert('[5a] refresh to online', getAuthorityStatus() === 'online')

    ingestPrimaryHeartbeat('host-device-1', Date.now() - 65_000)
    tickPrimaryCoordinator()
    assert('[5] 65s-old heartbeat status = lost', getAuthorityStatus() === 'lost')
    assert('[5] 65s-old heartbeat canAuthor=false', getPrimaryStatus().canAuthorStockOps === false)
  }

  // [6] Host mode overrides → ONLINE regardless of remote heartbeat state.
  {
    setHostMode(true)
    tickPrimaryCoordinator()
    const ps = getPrimaryStatus()
    assert('[6] host mode overrides stale/lost → online', ps.status === 'online')
    assert('[6] host mode canAuthorStockOps = true', ps.canAuthorStockOps === true)
  }

  // [7] Same-shop cooperation: re-issuing a fresh heartbeat should stay ONLINE.
  // (Boundary at exactly 15s isn't a clean assertion path because the SDK
  // uses strict inequality. The STALE/LOST thresholds above cover the spec.)
  {
    ingestPrimaryHeartbeat('host-device-1', Date.now())
    tickPrimaryCoordinator()
    assert('[7] re-fresh heartbeat remains online', getAuthorityStatus() === 'online')
  }

  console.log(`\nTotal: ${passed} passed, ${failed} failed`)
  process.exit(failed === 0 ? 0 : 1)
}

run().catch((err: unknown) => {
  console.error('test runner failed:', err)
  process.exit(2)
})
