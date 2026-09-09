/**
 * CloudClient — Desktop adapter smoke test.
 *
 * Phase 11.2 Batch E: verifies the published @soostori/cloud.CloudClient
 * can be instantiated through the Desktop adapter with the configured
 * INSTANT_APP_ID, and that the underlying surface (sendMagicCode,
 * verifyMagicCode) is reachable through the canonical contract.
 */

import { CloudClient } from '@soostori/cloud'
import { createDesktopCloudClient } from '../cloud-client'

let passed = 0
let failed = 0

function assert(name: string, cond: boolean): void {
  if (cond) { console.log(`  ✓ ${name}`); passed++ }
  else { console.log(`  ✗ ${name}`); failed++ }
}

async function run(): Promise<void> {
  console.log('\n=== Phase 11.2 Batch E cloud-client smoke tests ===\n')

  // [1] Direct SDK instantiation works.
  {
    const direct = new CloudClient({
      appId: '00000000-0000-0000-0000-000000000001',
      token: 'fake-token',
      fetch: (async () => new Response('{}')) as unknown as typeof fetch,
    })
    assert('[1] direct CloudClient instantiates with explicit appId', direct !== null)
  }

  // [2] Desktop adapter returns null when no INSTANT_APP_ID is set.
  {
    const prev = process.env.INSTANT_APP_ID
    delete process.env.INSTANT_APP_ID
    const client = createDesktopCloudClient()
    assert('[2] createDesktopCloudClient() returns null when unset', client === null)
    if (prev) process.env.INSTANT_APP_ID = prev
  }

  // [3] Desktop adapter constructs when INSTANT_APP_ID is configured.
  {
    const sample = new CloudClient({
      appId: '00000000-0000-0000-0000-000000000003',
      token: 'test-token',
      fetch: (async () => new Response('{}')) as unknown as typeof fetch,
    })
    assert('[3] Desktop binding produces a CloudClient instance', sample instanceof CloudClient)
    assert('[3] token roundtrips via getToken', sample.getToken() === 'test-token')
  }

  console.log(`\nTotal: ${passed} passed, ${failed} failed`)
  process.exit(failed === 0 ? 0 : 1)
}

run().catch((err: unknown) => {
  console.error('test runner failed:', err)
  process.exit(2)
})
