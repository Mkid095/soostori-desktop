/**
 * Cloud client — Desktop adapter.
 *
 * Phase 11.2 Batch E: bridges the published @soostori/cloud.CloudClient with
 * the Desktop's INSTANT_APP_ID environment. The InstantDB transport binding
 * remains Desktop-specific; this adapter only normalizes construction.
 */

import { CloudClient } from '@soostori/cloud'

export { CloudClient }

export const INSTANT_APP_ID = process.env.INSTANT_APP_ID ?? ''

/**
 * Build a Desktop-bound CloudClient. Returns null if no APP_ID is
 * configured (Desktop runs offline-only in that mode).
 */
export function createDesktopCloudClient(token?: string): CloudClient | null {
  if (!INSTANT_APP_ID) return null
  return new CloudClient({ appId: INSTANT_APP_ID, token })
}
