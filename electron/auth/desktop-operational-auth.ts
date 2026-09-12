/**
 * desktop-operational-auth.ts — Desktop singleton for SDK OperationalAuth.
 *
 * Wires the published `@soostori/auth` OperationalAuth class to:
 *   - ElectronPlatformAuthAdapter (already in use by CloudAuth) — secure storage
 *   - @soostori/auth/pin-node — PBKDF2 hashPin / verifyPin (canonical, no copy-paste)
 *
 * OperationalAuth is the second auth layer: after CloudAuth identifies the
 * employee, OperationalAuth verifies the device-local PIN and issues an
 * OperationalSession that gates stock-sensitive mutations for up to 24 hours
 * (with a 3-day offline entitlement window).
 *
 * CloudAuth NEVER touches this; OperationalAuth NEVER touches cloud credentials.
 */

import { OperationalAuth, type OperationalSession, type DeviceEnrollmentState, type OperationalCloudApi } from '@soostori/auth'
import { hashPin as sdkHashPin, verifyPin as sdkVerifyPin } from '@soostori/auth/pin-node'
import type { EmployeeId, ShopId, DeviceId } from '@soostori/core'
import { getPlatformAdapter } from './electron-platform-adapter'
import { getAuthApiClient } from './fidscript-auth-api'

let _opAuth: OperationalAuth | null = null

function getOpAuth(): OperationalAuth {
  if (!_opAuth) {
    _opAuth = new OperationalAuth({
      getSecureStorage: () => getPlatformAdapter().getSecureStorage(),
      randomString: (byteLength: number) => getPlatformAdapter().randomString(byteLength),
    })
  }
  return _opAuth
}

/** Cast FIDScriptAuthApiClient to OperationalCloudApi — shared subset used by OperationalAuth. */
function cloudApi(): OperationalCloudApi {
  return getAuthApiClient() as unknown as OperationalCloudApi
}

// ─── Public surface consumed by IPC handlers ────────────────────────────────

export interface SetupPinResult { ok: boolean; salt?: string; verifierHash?: string; error?: string }

export async function setupPin(employeeId: EmployeeId, shopId: ShopId, deviceId: DeviceId, pin: string): Promise<SetupPinResult> {
  const r = await getOpAuth().setupPin({
    pin,
    hashPin: (p) => { const out = sdkHashPin(p); return { hash: out.hash, salt: out.salt } },
    employeeId, shopId, deviceId,
  })
  if (!r.ok) return { ok: false, error: r.error.message }
  return { ok: true, salt: r.data.salt, verifierHash: r.data.verifierHash }
}

export interface VerifyPinResult { ok: boolean; session?: OperationalSession; error?: string }

export async function verifyPin(employeeId: EmployeeId, shopId: ShopId, deviceId: DeviceId, pin: string): Promise<VerifyPinResult> {
  const r = await getOpAuth().verifyPin({
    pin,
    verifyPin: sdkVerifyPin,
    employeeId, shopId, deviceId,
  })
  if (!r.ok) return { ok: false, error: r.error.message }
  return { ok: true, session: r.data }
}

export async function changePin(
  employeeId: EmployeeId, shopId: ShopId, deviceId: DeviceId,
  oldPin: string, newPin: string,
): Promise<SetupPinResult> {
  const r = await getOpAuth().changePin({
    oldPin, newPin,
    hashPin: (p) => { const out = sdkHashPin(p); return { hash: out.hash, salt: out.salt } },
    verifyPin: sdkVerifyPin,
    employeeId, shopId, deviceId,
  })
  if (!r.ok) return { ok: false, error: r.error.message }
  return { ok: true, salt: r.data.salt, verifierHash: r.data.verifierHash }
}

export async function hasPinEnrolled(): Promise<boolean> {
  return getOpAuth().hasPinEnrolled()
}

export async function clearPin(): Promise<void> {
  await getOpAuth().clearPin()
}

export function isWithinOfflineEntitlement(session: OperationalSession): boolean {
  return getOpAuth().isWithinOfflineEntitlement(session)
}

export function isSessionExpired(session: OperationalSession): boolean {
  return getOpAuth().isSessionExpired(session)
}

export function getOpAuthLockState(): { failedAttempts: number; isLocked: boolean; lockedUntilMs: number | null } {
  const a = getOpAuth()
  return { failedAttempts: a.failedAttemptCount, isLocked: a.isLocked, lockedUntilMs: a.lockedUntilMs }
}

// ── Phase 01 gap fixes — enrollment + recovery ─────────────────────────────

export async function getEnrollmentState(shopId: ShopId, deviceId: DeviceId): Promise<DeviceEnrollmentState> {
  return getOpAuth().getEnrollmentState({
    cloudApi: cloudApi(),
    shopId,
    deviceId,
  })
}

export async function beginEnrollment(params: {
  state: DeviceEnrollmentState
  shopId: ShopId
  deviceId: DeviceId
  deviceName: string
  employeeId?: EmployeeId
  pinVerificationProof?: string
}): Promise<{ nextState: DeviceEnrollmentState; enrollmentToken?: string; employeeId?: EmployeeId }> {
  const r = await getOpAuth().beginEnrollment({
    cloudApi: cloudApi(),
    ...params,
  })
  if (!r.ok) throw new Error(r.error.message)
  if ('needsCloudVerify' in r.data) {
    return { nextState: 'PIN_VERIFICATION_REQUIRED', employeeId: r.data.employeeId }
  }
  return { nextState: r.data.nextState, enrollmentToken: r.data.enrollmentToken }
}

export async function completeEnrollmentWithCloudVerify(params: {
  enrollmentToken: string
  employeeId: EmployeeId
  shopId: ShopId
  deviceId: DeviceId
  newPin: string
}): Promise<void> {
  const hashed = sdkHashPin(params.newPin)
  const r = await getOpAuth().completeEnrollmentWithCloudVerify({
    cloudApi: cloudApi(),
    enrollmentToken: params.enrollmentToken,
    employeeId: params.employeeId,
    shopId: params.shopId,
    deviceId: params.deviceId,
    newPin: params.newPin,
    newPinHash: hashed.hash,
    newPinSalt: hashed.salt,
  })
  if (!r.ok) throw new Error(r.error.message)
}

export async function requestPinRecovery(employeeId: EmployeeId): Promise<{ cooldownSeconds: number }> {
  const r = await getOpAuth().requestPinRecovery({
    cloudApi: cloudApi(),
    employeeId,
  })
  if (!r.ok) throw new Error(r.error.message)
  return { cooldownSeconds: r.data.cooldownSeconds }
}

export async function verifyPinRecoveryCode(employeeId: EmployeeId, code: string): Promise<{ recoveryAuthToken: string; expiresAt: string }> {
  const r = await getOpAuth().verifyPinRecoveryCode({
    cloudApi: cloudApi(),
    employeeId,
    code,
  })
  if (!r.ok) throw new Error(r.error.message)
  return { recoveryAuthToken: r.data.recoveryAuthToken, expiresAt: r.data.expiresAt }
}

export async function resetPinWithRecovery(params: {
  recoveryAuthToken: string
  employeeId: EmployeeId
  newPin: string
  shopId: ShopId
  deviceId: DeviceId
}): Promise<void> {
  const hashed = sdkHashPin(params.newPin)
  const r = await getOpAuth().resetPinWithRecovery({
    cloudApi: cloudApi(),
    recoveryAuthToken: params.recoveryAuthToken,
    employeeId: params.employeeId,
    newPin: params.newPin,
    hashPin: (p) => { const out = sdkHashPin(p); return { hash: out.hash, salt: out.salt } },
    shopId: params.shopId,
    deviceId: params.deviceId,
  })
  if (!r.ok) throw new Error(r.error.message)
}

export function serializeOpSession(session: OperationalSession): string {
  return getOpAuth().serializeSession(session)
}

export function deserializeOpSession(raw: string): OperationalSession | null {
  return getOpAuth().deserializeSession(raw)
}
