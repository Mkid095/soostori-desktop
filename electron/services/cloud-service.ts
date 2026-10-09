/**
 * CloudService — Phase 1 scaffold for cloud communication.
 *
 * Uses InstantDB as the cloud backend via REST (same API as the web project).
 * All three methods query InstantDB directly — no external VPS API needed.
 *
 * Subscription/device verification flow:
 *   1. On startup: verifySubscription() → checks InstantDB subscription status
 *   2. If 3-day window exceeded and not verified: block POS, show subscription banner
 *   3. Device heartbeat: reportHeartbeat() updates last_seen on the device in InstantDB
 *
 * Cloud health: checkCloudHealth() hits InstantDB's /health endpoint
 */

import { getSyncStore } from './store'
import log from 'electron-log'

export interface CloudConfig {
  apiBaseUrl: string   // InstantDB REST API base, e.g. https://apiinstant.fidscript.com
  appId: string       // InstantDB app ID
  apiKey: string       // InstantDB API key (admin token)
}

export interface SubscriptionStatus {
  valid: boolean
  expiresAt: string | null   // ISO date string
  plan: string | null
  deviceCount: number | null
}

export interface DeviceHeartbeat {
  deviceId: string
  shopId: string
  timestamp: string
  mode: 'online' | 'offline'
  lastSaleAt: string | null
}

export interface CloudHealth {
  reachable: boolean
  latencyMs: number | null
}

let _config: CloudConfig | null = null
let _subStatus: SubscriptionStatus = { valid: true, expiresAt: null, plan: 'trial', deviceCount: null }
let _lastHeartbeat = 0
let _unverifiedDays = 0

export function configureCloudService(config: CloudConfig): void {
  _config = config
  log.info(`CloudService: configured with base ${config.apiBaseUrl}`)
}

/** Returns cached subscription status. Does NOT make a network request. */
export function getSubscriptionStatus(): SubscriptionStatus {
  return _subStatus
}

/**
 * Verifies subscription status from InstantDB.
 * Queries the device's shop, then the shop's subscription to get status and expiry.
 */
export async function verifySubscription(): Promise<SubscriptionStatus> {
  if (!_config) return _subStatus

  const store = getSyncStore()
  const deviceId = store.get('deviceId') as string | undefined
  const shopId = store.get('shopId') as string | undefined

  if (!shopId) {
    log.info('CloudService: no shopId set, returning trial')
    _subStatus = { valid: true, expiresAt: null, plan: 'trial', deviceCount: null }
    return _subStatus
  }

  try {
    // Query the shop's active subscription
    const subRes = await fetch(
      `${_config.apiBaseUrl}/api/v1/apps/${_config.appId}/instaql/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${_config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptions: {
            $: { where: { shopId }, limit: 1 },
            id: true,
            status: true,
            planKey: true,
            currentPeriodEnd: true,
          },
        }),
      }
    )

    if (!subRes.ok) throw new Error(`InstantDB HTTP ${subRes.status}`)
    const subData = await subRes.json() as {
      subscriptions?: Array<{
        id: string
        status: string
        planKey: string | null
        currentPeriodEnd: string | null
      }>
    }

    const sub = subData?.subscriptions?.[0]

    if (!sub || sub.status !== 'active') {
      _subStatus = { valid: false, expiresAt: null, plan: null, deviceCount: null }
      log.info('CloudService: no active subscription found')
      return _subStatus
    }

    // Count devices for this shop
    const devRes = await fetch(
      `${_config.apiBaseUrl}/api/v1/apps/${_config.appId}/instaql/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${_config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          devices: {
            $: { where: { shopId }, limit: 100 },
            id: true,
          },
        }),
      }
    )
    const devData = devRes.ok ? await devRes.json() as { devices?: unknown[] } : { devices: [] }
    const deviceCount = devData.devices?.length ?? 0

    _subStatus = {
      valid: true,
      expiresAt: sub.currentPeriodEnd ?? null,
      plan: sub.planKey ?? 'unknown',
      deviceCount,
    }
    log.info('CloudService: subscription verified', _subStatus)
    return _subStatus
  } catch (err) {
    log.error('CloudService: verifySubscription failed, returning trial', err)
    // Fail open — don't block POS on cloud errors
    _subStatus = { valid: true, expiresAt: null, plan: 'trial', deviceCount: null }
    return _subStatus
  }
}

/**
 * Reports a device heartbeat to InstantDB — updates last_seen on the device record.
 * Throttled to once per 5 minutes. Non-critical: errors are logged but never thrown.
 */
export async function reportHeartbeat(heartbeat: DeviceHeartbeat): Promise<void> {
  const now = Date.now()
  if (now - _lastHeartbeat < 5 * 60 * 1000) return
  _lastHeartbeat = now

  if (!_config) return

  try {
    // InstantDB REST does not have a built-in "touch" endpoint, so we use Instaml
    // to update last_seen on the device via the transact API.
    await fetch(
      `${_config.apiBaseUrl}/instaml/tx`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${_config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patches: [
            {
              table: 'devices',
              where: { id: heartbeat.deviceId },
              set: {
                lastSeenAt: heartbeat.timestamp,
                mode: heartbeat.mode,
              },
            },
          ],
        }),
      }
    )
    log.debug('CloudService: heartbeat reported', heartbeat)
  } catch (err) {
    // Non-critical — log and continue
    log.warn('CloudService: heartbeat failed (non-critical)', err)
  }
}

/**
 * Checks InstantDB health with a 3-second timeout.
 * Returns reachable + latency in ms, or { reachable: false, latencyMs: null } on failure.
 * Used by the UI to show cloud connectivity status; does not affect POS operation.
 */
export async function checkCloudHealth(): Promise<CloudHealth> {
  if (!_config) return { reachable: false, latencyMs: null }
  const t0 = Date.now()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    await fetch(`${_config.apiBaseUrl}/health`, {
      method: 'HEAD',
      signal: controller.signal as RequestInit['signal'],
    })
    clearTimeout(timeout)
    return { reachable: true, latencyMs: Date.now() - t0 }
  } catch {
    return { reachable: false, latencyMs: null }
  }
}

/** Returns true if the unverified window has passed (3 days). */
export function isUnverifiedTooLong(): boolean {
  const store = getSyncStore()
  const firstLaunch = (store.get('firstLaunchAt') as string | undefined) ?? new Date().toISOString()
  store.set('firstLaunchAt', firstLaunch)
  const days = (Date.now() - new Date(firstLaunch).getTime()) / (1000 * 60 * 60 * 24)
  return days > 3
}

export function getUnverifiedDays(): number {
  const store = getSyncStore()
  const firstLaunch = (store.get('firstLaunchAt') as string | undefined) ?? new Date().toISOString()
  return Math.floor((Date.now() - new Date(firstLaunch).getTime()) / (1000 * 60 * 60 * 24))
}
