/**
 * CloudService — Phase 1 scaffold for cloud communication.
 *
 * Currently a thin facade: all methods are stubs that return safe defaults so the
 * app works fully offline. Wire to the real fidscript_api (Go backend, Phase 3)
 * by replacing the stub implementations below.
 *
 * Subscription/device verification flow (Phase 3):
 *   1. On startup: GET /devices/verify?deviceId=&shopId= → { valid, expiresAt }
 *   2. If 3-day window exceeded and not verified: block POS, show subscription banner
 *   3. Device heartbeat: POST /devices/heartbeat every 5 min while online
 */

import { getSyncStore } from './store'
import log from 'electron-log'

export interface CloudConfig {
  apiBaseUrl: string   // e.g. https://api.yourvps.com
  apiKey: string       // device-level API key (from cloud provisioning)
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

export async function verifySubscription(): Promise<SubscriptionStatus> {
  // TODO (Phase 3): replace with real API call
  // GET /devices/verify?deviceId=&shopId=
  // const res = await fetch(`${_config!.apiBaseUrl}/devices/verify?deviceId=${deviceId}&shopId=${shopId}`, {
  //   headers: { Authorization: `Bearer ${_config!.apiKey}` }
  // })
  // _subStatus = await res.json()
  _subStatus = { valid: true, expiresAt: null, plan: 'trial', deviceCount: null }
  log.info('CloudService: subscription verified (stub)')
  return _subStatus
}

export async function reportHeartbeat(heartbeat: DeviceHeartbeat): Promise<void> {
  const now = Date.now()
  if (now - _lastHeartbeat < 5 * 60 * 1000) return  // throttle: max once per 5 min
  _lastHeartbeat = now

  // TODO (Phase 3): replace with real API call
  // POST /devices/heartbeat
  // await fetch(`${_config!.apiBaseUrl}/devices/heartbeat`, {
  //   method: 'POST',
  //   headers: { Authorization: `Bearer ${_config!.apiKey}`, 'Content-Type': 'application/json' },
  //   body: JSON.stringify(heartbeat),
  // })
  log.debug('CloudService: heartbeat reported (stub)', heartbeat)
}

export async function checkCloudHealth(): Promise<CloudHealth> {
  if (!_config) return { reachable: false, latencyMs: null }
  // TODO (Phase 3): replace with real ping
  // const t0 = Date.now()
  // try {
  //   await fetch(`${_config.apiBaseUrl}/health`, { method: 'HEAD', signal: AbortSignal.timeout(3000) })
  //   return { reachable: true, latencyMs: Date.now() - t0 }
  // } catch { return { reachable: false, latencyMs: null } }
  return { reachable: false, latencyMs: null }
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
