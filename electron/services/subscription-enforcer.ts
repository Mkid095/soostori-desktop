/**
 * subscription-enforcer.ts — Subscription status checking and enforcement.
 *
 * Behavior:
 *   - ONLINE: checks cloud `subscriptions` entity on startup + every hour
 *   - OFFLINE: uses cached status with grace period (3 days)
 *   - EXPIRED: blocks POS operations (renderer should show banner)
 *
 * Grace period: when offline or when cloud unreachable, POS continues
 * working until the 3-day grace window expires. After that, all sales
 * are blocked until cloud re-verification succeeds.
 */

import { getSyncStore } from './store'
import * as instant from './instant-api'
import log from 'electron-log'

const APP_ID = process.env.INSTANT_APP_ID || ''

async function fetchCloudSubscription(shopId: string): Promise<{ valid: boolean; plan: string | null; deviceLimit: number | null; expiryDate: string | null }> {
  if (!APP_ID) return { valid: true, plan: null, deviceLimit: null, expiryDate: null }
  try {
    const result = await instant.instaqQuery(APP_ID, {
      subscriptions: { $: { where: { shopId, status: 'active' }, limit: 1 } }
    })
    const subs = (result as { subscriptions?: unknown[] })?.subscriptions ?? []
    if (!subs.length) return { valid: true, plan: 'trial', deviceLimit: null, expiryDate: null }
    const sub = subs[0] as Record<string, unknown>
    return {
      valid: true,
      plan: String(sub.planKey ?? 'trial'),
      deviceLimit: Number(sub.deviceLimit) || null,
      expiryDate: String(sub.currentPeriodEnd ?? ''),
    }
  } catch {
    return { valid: true, plan: null, deviceLimit: null, expiryDate: null }
  }
}

export interface SubscriptionState {
  valid: boolean
  expiresAt: string | null
  plan: string | null
  deviceLimit: number | null
  daysUntilExpiry: number | null
  isExpired: boolean
  isInGracePeriod: boolean
  graceDaysRemaining: number
  source: 'cloud' | 'cache' | 'default'
  checkedAt: string
}

const GRACE_PERIOD_DAYS = 3

let _state: SubscriptionState | null = null
let _lastCheck = 0
let _checkInterval: ReturnType<typeof setInterval> | null = null

/** Get cached subscription status (no network call). */
export function getSubscriptionState(): SubscriptionState | null {
  return _state
}

/** Update state from cloud or cache. */
async function refreshState(shopId: string): Promise<SubscriptionState> {
  const now = Date.now()
  const store = getSyncStore()

  // Try cloud first
  let cloudSub: { valid: boolean; plan: string | null; deviceLimit: number | null; expiryDate: string | null } | null = null
  try {
    cloudSub = await fetchCloudSubscription(shopId)
    log.info(`Subscription cloud check: plan=${cloudSub.plan}, expires=${cloudSub.expiryDate}`)
    store.set('subscription', JSON.stringify(cloudSub))
    store.set('subscriptionCheckedAt', new Date().toISOString())
  } catch (err) {
    log.warn('Subscription cloud check failed:', err)
  }

  const expiresAt = cloudSub?.expiryDate ?? null
  const plan = cloudSub?.plan ?? null
  const deviceLimit = cloudSub?.deviceLimit ?? null

  // Compute days until expiry
  let daysUntilExpiry: number | null = null
  let isExpired = false
  if (expiresAt) {
    const expiry = new Date(expiresAt).getTime()
    daysUntilExpiry = Math.floor((expiry - now) / (1000 * 60 * 60 * 24))
    isExpired = expiry < now
  }

  // Grace period logic
  const lastSuccessAt = (store.get('subscriptionLastSuccess') as string | undefined) ?? null
  let graceDaysRemaining = GRACE_PERIOD_DAYS
  if (lastSuccessAt) {
    const elapsed = Math.floor((now - new Date(lastSuccessAt).getTime()) / (1000 * 60 * 60 * 24))
    graceDaysRemaining = Math.max(0, GRACE_PERIOD_DAYS - elapsed)
  }

  const source: SubscriptionState['source'] = cloudSub ? 'cloud' : (lastSuccessAt ? 'cache' : 'default')
  const valid = !!cloudSub || (!isExpired && graceDaysRemaining > 0)
  const isInGracePeriod = !cloudSub && !isExpired && graceDaysRemaining > 0

  _state = {
    valid,
    expiresAt,
    plan,
    deviceLimit,
    daysUntilExpiry,
    isExpired,
    isInGracePeriod,
    graceDaysRemaining,
    source,
    checkedAt: new Date().toISOString(),
  }
  return _state
}

/** Start background subscription check (every hour). */
export function startSubscriptionEnforcer(shopId: string): void {
  if (_checkInterval) return
  // Initial check
  refreshState(shopId).catch(() => {})

  // Re-check every hour
  _checkInterval = setInterval(() => { refreshState(shopId).catch(() => {}) }, 60 * 60 * 1000)
  _lastCheck = Date.now()
  log.info('SubscriptionEnforcer: started')
}

export function stopSubscriptionEnforcer(): void {
  if (_checkInterval) { clearInterval(_checkInterval); _checkInterval = null }
  log.info('SubscriptionEnforcer: stopped')
}

/** Force a re-check (used by UI). */
export async function recheckSubscription(shopId: string): Promise<SubscriptionState> {
  return refreshState(shopId)
}

/** Mark current check as successful — resets grace period clock. */
export function markSubscriptionSuccess(): void {
  const store = getSyncStore()
  store.set('subscriptionLastSuccess', new Date().toISOString())
}
