/**
 * operational-auth.test.ts — Integration test for OperationalAuth via @soostori/auth.
 *
 * Uses Node's built-in `node:test` + `tsx` runner (no extra dependency needed;
 * Desktop does not yet have vitest configured). Exercises the SDK OperationalAuth
 * class that desktop-operational-auth.ts wraps, using an in-memory SecureStorage
 * mock — proving setupPin → verifyPin → changePin flow end-to-end.
 *
 * Run with:
 *   /c/Program\ Files/nodejs/node --import tsx --test electron/auth/__tests__/operational-auth.test.ts
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { OperationalAuth } from '@soostori/auth'
import { hashPin as sdkHashPin, verifyPin as sdkVerifyPin } from '@soostori/auth/pin-node'
import type { OperationalPlatformAdapter } from '@soostori/auth'

// ─── In-memory secure-storage mock ────────────────────────────────────────

function makeMockAdapter(): OperationalPlatformAdapter & { store: Map<string, string> } {
  const store = new Map<string, string>()
  return {
    store,
    getSecureStorage() {
      return {
        async get(key: string) { return store.get(key) ?? null },
        async set(key: string, value: string) { store.set(key, value) },
        async delete(key: string) { store.delete(key) },
      }
    },
    randomString(byteLength: number) {
      return Array.from({ length: byteLength }, () => Math.floor(Math.random() * 256))
        .map(b => b.toString(16).padStart(2, '0')).join('')
    },
  }
}

const empId = 'emp_test_1' as unknown as Parameters<OperationalAuth['setupPin']>[0]['employeeId']
const shopId = 'shop_test_1' as unknown as Parameters<OperationalAuth['setupPin']>[0]['shopId']
const devId = 'dev_test_1' as unknown as Parameters<OperationalAuth['setupPin']>[0]['deviceId']

test('setupPin then verifyPin returns true for matching PIN', async () => {
  const adapter = makeMockAdapter()
  const opAuth = new OperationalAuth(adapter)
  const hashFn = (p: string) => { const o = sdkHashPin(p); return { hash: o.hash, salt: o.salt } }

  const setup = await opAuth.setupPin({ pin: '1234', hashPin: hashFn, employeeId: empId, shopId: shopId, deviceId: devId })
  assert.equal(setup.ok, true)
  assert.ok(setup.data && setup.data.salt && setup.data.verifierHash)

  const verify = await opAuth.verifyPin({ pin: '1234', verifyPin: sdkVerifyPin, employeeId: empId, shopId: shopId, deviceId: devId })
  assert.equal(verify.ok, true)
  assert.ok(verify.data && verify.data.employeeId === empId)
})

test('verifyPin returns false for wrong PIN', async () => {
  const adapter = makeMockAdapter()
  const opAuth = new OperationalAuth(adapter)
  const hashFn = (p: string) => { const o = sdkHashPin(p); return { hash: o.hash, salt: o.salt } }

  await opAuth.setupPin({ pin: '1234', hashPin: hashFn, employeeId: empId, shopId: shopId, deviceId: devId })
  const verify = await opAuth.verifyPin({ pin: '9999', verifyPin: sdkVerifyPin, employeeId: empId, shopId: shopId, deviceId: devId })
  assert.equal(verify.ok, false)
  if (!verify.ok) assert.equal(verify.error.code, 'PIN_VERIFICATION_FAILED')
})

test('changePin invalidates old PIN and accepts new PIN', async () => {
  const adapter = makeMockAdapter()
  const opAuth = new OperationalAuth(adapter)
  const hashFn = (p: string) => { const o = sdkHashPin(p); return { hash: o.hash, salt: o.salt } }

  await opAuth.setupPin({ pin: '1234', hashPin: hashFn, employeeId: empId, shopId: shopId, deviceId: devId })
  const change = await opAuth.changePin({
    oldPin: '1234', newPin: '5678',
    hashPin: hashFn, verifyPin: sdkVerifyPin,
    employeeId: empId, shopId: shopId, deviceId: devId,
  })
  assert.equal(change.ok, true)

  const oldVerify = await opAuth.verifyPin({ pin: '1234', verifyPin: sdkVerifyPin, employeeId: empId, shopId: shopId, deviceId: devId })
  assert.equal(oldVerify.ok, false)

  const newVerify = await opAuth.verifyPin({ pin: '5678', verifyPin: sdkVerifyPin, employeeId: empId, shopId: shopId, deviceId: devId })
  assert.equal(newVerify.ok, true)
})

test('clearPin removes the local verifier', async () => {
  const adapter = makeMockAdapter()
  const opAuth = new OperationalAuth(adapter)
  const hashFn = (p: string) => { const o = sdkHashPin(p); return { hash: o.hash, salt: o.salt } }

  await opAuth.setupPin({ pin: '1234', hashPin: hashFn, employeeId: empId, shopId: shopId, deviceId: devId })
  assert.equal(await opAuth.hasPinEnrolled(), true)
  await opAuth.clearPin()
  assert.equal(await opAuth.hasPinEnrolled(), false)
})
