/**
 * cloud-auth.ts — Cloud identity authentication (login + device registration).
 *
 * Magic-code login flow:
 *   1. requestMagicCode(email) → sends code via InstantDB email service
 *   2. verifyMagicCode(email, code) → returns CloudSession
 *   3. registerDevice(session, ...) → creates/links cloud device record
 *
 * Session persistence via electron-store.
 */

import { getDatabase } from '../database'
import { getSyncStore } from './store'
import * as instant from './instant-api'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'

const APP_ID = process.env.INSTANT_APP_ID || ''

export interface CloudSession {
  userId: string
  email: string
  deviceId: string
  shopId: string
  plan: string | null
  deviceType: 'desktop' | 'mobile'
}

export interface EmployeeCache {
  id: string; cloudId: string; shopId: string; name: string
  role: string; pinHash: string; pinSalt: string; isActive: number
}

let _session: CloudSession | null = null
let _employees: EmployeeCache[] = []

// ── Magic Code Login ──────────────────────────────────────────────────────────

export async function requestMagicCode(email: string): Promise<{ codeSent: boolean; message: string }> {
  if (!APP_ID) return { codeSent: false, message: 'Cloud not configured' }
  try {
    const res = await fetch(`${instant.INSTANT_API_URI}/api/v1/apps/${APP_ID}/auth/magic-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, type: 'email' }),
    })
    if (res.ok) { log.info(`Magic code sent to ${email}`); return { codeSent: true, message: 'Code sent' } }
    const err = await res.json().catch(() => ({}))
    return { codeSent: false, message: String(err?.error ?? res.statusText) }
  } catch (err) { return { codeSent: false, message: 'Network error' } }
}

export async function verifyMagicCode(email: string, code: string): Promise<CloudSession | null> {
  if (!APP_ID) return null
  try {
    const res = await fetch(`${instant.INSTANT_API_URI}/api/v1/apps/${APP_ID}/auth/magic-code/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    })
    if (!res.ok) return null
    const data = await res.json() as { user: { id: string; email: string } }
    log.info(`Magic code verified for ${email}`)
    return { userId: data.user.id, email: data.user.email, deviceId: '', shopId: '', plan: null, deviceType: 'desktop' }
  } catch { return null }
}

// ── Device Registration ───────────────────────────────────────────────────────

export async function registerDevice(
  cloudUser: CloudSession, deviceId: string, deviceName: string,
  employeeId: string, employeeName: string
): Promise<CloudSession> {
  if (!APP_ID) return { ...cloudUser, deviceId, shopId: 'local', plan: 'trial', deviceType: 'desktop' }
  try {
    // Create or resolve cloud device
    const existing = await instant.instaqQuery(APP_ID, { devices: { $: { where: { deviceName } } } })
    const devices = (existing as { devices?: unknown[] })?.devices ?? []
    let cloudDeviceId = devices.length ? String((devices[0] as Record<string, unknown>).id ?? '') : deviceId
    if (!devices.length) {
      await instant.instamlTx(APP_ID, [['create', 'devices', deviceId, {
        deviceName, deviceType: 'desktop', status: 'active',
        authorizedAt: new Date().toISOString(), lastSeenAt: new Date().toISOString(),
      }]])
    }

    // Resolve shop from employee
    const empRes = await instant.instaqQuery(APP_ID, { employees: { $: { where: { id: employeeId } } } })
    const emps = (empRes as { employees?: unknown[] })?.employees ?? []
    const shopId = String((emps[0] as Record<string, unknown>)?.shopId ?? '')

    return { ...cloudUser, deviceId: cloudDeviceId, shopId, plan: 'trial', deviceType: 'desktop' }
  } catch (err) {
    log.warn('registerDevice failed', err)
    return { ...cloudUser, deviceId, shopId: 'local', plan: 'trial', deviceType: 'desktop' }
  }
}

// ── Subscription Check ────────────────────────────────────────────────────────

export async function checkCloudSubscription(shopId: string): Promise<{
  valid: boolean; plan: string | null; deviceLimit: number | null; expiryDate: string | null
}> {
  if (!APP_ID) return { valid: true, plan: null, deviceLimit: null, expiryDate: null }
  try {
    const result = await instant.instaqQuery(APP_ID, {
      subscriptions: { $: { where: { shopId, status: 'active' }, limit: 1 } }
    })
    const subs = (result as { subscriptions?: unknown[] })?.subscriptions ?? []
    if (!subs.length) return { valid: true, plan: 'trial', deviceLimit: null, expiryDate: null }
    const sub = subs[0] as Record<string, unknown>
    return { valid: true, plan: String(sub.planKey ?? 'trial'), deviceLimit: Number(sub.deviceLimit) || null, expiryDate: String(sub.currentPeriodEnd ?? '') }
  } catch { return { valid: true, plan: null, deviceLimit: null, expiryDate: null } }
}

// ── Session Management ────────────────────────────────────────────────────────

export function setSession(session: CloudSession | null): void {
  _session = session
  const store = getSyncStore()
  if (session) store.set('cloudSession', JSON.stringify(session))
  else store.delete('cloudSession')
}

export function getSession(): CloudSession | null {
  if (_session) return _session
  const store = getSyncStore()
  const raw = store.get('cloudSession') as string | undefined
  if (!raw) return null
  try { _session = JSON.parse(raw); return _session } catch { return null }
}

export function clearSession(): void {
  _session = null; _employees = []
  const store = getSyncStore()
  store.delete('cloudSession'); store.delete('cloudDeviceId')
}

export function getEmployees(): EmployeeCache[] { return _employees }
