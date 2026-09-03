/**
 * cloud-auth.ts — Cloud identity authentication (magic code login).
 *
 * Uses the same endpoint pattern as mobile's @fidscript/instant-react.
 * Desktop has no Electron SDK — uses REST API directly.
 */

import { sendMagicCode as apiSendMagicCode, verifyMagicCode as apiVerifyMagicCode } from './instant-api'
import { getSyncStore } from './store'
import log from 'electron-log'
import type { SessionData } from './cloud-schema'

const APP_ID = process.env.INSTANT_APP_ID || ''

let _session: SessionData | null = null

export async function requestMagicCode(email: string): Promise<{ ok: boolean; error?: string }> {
  if (!APP_ID) return { ok: false, error: 'Cloud not configured' }
  return apiSendMagicCode(email)
}

export async function verifyMagicCode(email: string, code: string): Promise<SessionData | null> {
  if (!APP_ID) return null
  const result = await apiVerifyMagicCode(email, code)
  if (!result.ok || !result.userId) {
    log.warn('verifyMagicCode failed:', result.error)
    return null
  }
  const session: SessionData = {
    userId: result.userId,
    deviceId: '',
    shopId: '',
    employeeId: '',
    email: result.email_ ?? email,
  }
  log.info(`Magic code verified for ${email}, userId=${result.userId}`)
  return session
}

// ── Session management ────────────────────────────────────────────────────────

export function setSession(session: SessionData | null): void {
  _session = session
  const store = getSyncStore()
  if (session) store.set('cloudSession', JSON.stringify(session))
  else store.delete('cloudSession')
}

export function getSession(): SessionData | null {
  if (_session) return _session
  const store = getSyncStore()
  const raw = store.get('cloudSession') as string | undefined
  if (!raw) return null
  try { _session = JSON.parse(raw); return _session } catch { return null }
}

export function clearSession(): void {
  _session = null
  const store = getSyncStore()
  store.delete('cloudSession')
  store.delete('cloudDeviceId')
}

export function setDeviceId(deviceId: string): void {
  _session = _session ? { ..._session, deviceId } : null
  const store = getSyncStore()
  store.set('cloudDeviceId', deviceId)
}

export function getDeviceId(): string {
  return _session?.deviceId ?? getSyncStore().get('cloudDeviceId') as string ?? ''
}

export function getShopId(): string {
  return _session?.shopId ?? getSyncStore().get('shopId') as string ?? ''
}

export function getEmployeeId(): string {
  return _session?.employeeId ?? getSyncStore().get('employeeId') as string ?? ''
}
