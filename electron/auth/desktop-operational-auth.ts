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

import { OperationalAuth, type OperationalPlatformAdapter, type OperationalSession } from '@soostori/auth'
import { hashPin as sdkHashPin, verifyPin as sdkVerifyPin } from '@soostori/auth/pin-node'
import type { EmployeeId, ShopId, DeviceId } from '@soostori/core'
import { getPlatformAdapter } from './electron-platform-adapter'

// OperationalAuth only needs the secure-storage slice of the full platform adapter.
// We adapt ElectronPlatformAuthAdapter's SecureStorage return value to the
// narrower OperationalPlatformAdapter contract via a thin wrapper.
class DesktopOperationalPlatformAdapter implements OperationalPlatformAdapter {
  getSecureStorage() {
    return getPlatformAdapter().getSecureStorage()
  }
  randomString(byteLength: number): string {
    return getPlatformAdapter().randomString(byteLength)
  }
}

let _opAuth: OperationalAuth | null = null

function getOpAuth(): OperationalAuth {
  if (!_opAuth) {
    _opAuth = new OperationalAuth(new DesktopOperationalPlatformAdapter())
  }
  return _opAuth
}

// ─── Public surface consumed by IPC handlers ────────────────────────────────

export interface SetupPinResult { ok: boolean; salt?: string; verifierHash?: string; error?: string }

export async function setupPin(employeeId: EmployeeId, shopId: ShopId, deviceId: DeviceId, pin: string): Promise<SetupPinResult> {
  const r = await getOpAuth().setupPin({
    pin,
    hashPin: (p, s) => { const out = sdkHashPin(p, s); return { hash: out.hash, salt: out.salt } },
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
    hashPin: (p, s) => { const out = sdkHashPin(p, s); return { hash: out.hash, salt: out.salt } },
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
