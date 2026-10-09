/**
 * subscription-cloud-fetcher.ts — Cloud subscription lookup.
 *
 * Extracted from subscription-enforcer.ts to keep that file under the
 * ANPAS 150-line limit. Performs a single InstaQL query against the
 * subscriptions entity, returning a normalized shape.
 *
 * Phase 5B P0-2d: now also reads `setupGraceEndsAt` so the canonical
 * 5-state classifier (SETUP_GRACE vs ACTIVE) can resolve correctly.
 * The cloud schema may not yet have this field — when absent, the
 * returned value is `null` and the classifier falls back to ACTIVE.
 */

import * as instant from './instant-api'

const APP_ID = process.env.INSTANT_APP_ID || ''

export interface CloudSubscription {
  valid: boolean
  plan: string | null
  deviceLimit: number | null
  expiryDate: string | null
  /** ISO 8601 or null. Set only on the first payment cycle in canonical model. */
  setupGraceEndsAt: string | null
  /** Legacy cloud status — lowercase. Mapped to canonical 5-state by the refresher. */
  status: string | null
}

export async function fetchCloudSubscription(shopId: string): Promise<CloudSubscription> {
  if (!APP_ID) {
    return { valid: true, plan: null, deviceLimit: null, expiryDate: null, setupGraceEndsAt: null, status: null }
  }
  try {
    const result = await instant.instaqQuery(APP_ID, {
      subscriptions: { $: { where: { shopId, status: 'active' }, limit: 1 } }
    })
    const subs = (result as { subscriptions?: unknown[] })?.subscriptions ?? []
    if (!subs.length) {
      return { valid: true, plan: 'trial', deviceLimit: null, expiryDate: null, setupGraceEndsAt: null, status: 'active' }
    }
    const sub = subs[0] as Record<string, unknown>
    return {
      valid: true,
      plan: String(sub.planKey ?? 'trial'),
      deviceLimit: Number(sub.deviceLimit) || null,
      expiryDate: String(sub.currentPeriodEnd ?? ''),
      // Cloud schema may not have setupGraceEndsAt yet — treat absent as null.
      setupGraceEndsAt: sub.setupGraceEndsAt ? String(sub.setupGraceEndsAt) : null,
      status: sub.status ? String(sub.status) : 'active',
    }
  } catch {
    return { valid: true, plan: null, deviceLimit: null, expiryDate: null, setupGraceEndsAt: null, status: null }
  }
}
