/**
 * active-shop.ts — Resolve the active shop_id for IPC handlers (§7 isolation).
 *
 * Resolution order:
 *   1. session.shopId  (auth-handlers establishes this on login)
 *   2. shops table     (fallback for single-tenant installations)
 *   3. 'default'       (last-resort literal that matches the column DEFAULT)
 *
 * Imported by handlers that need to stamp shop_id on INSERTs and filter
 * SELECTs. Pure function — no I/O side effects beyond a single SQLite read.
 */

import { getDatabase } from './index'
import { desktopLoadSession } from '../auth/electron-store-session'

/**
 * Resolve the active shop id without requiring a loaded session.
 * Use this in INSERT paths where you must stamp shop_id but no caller
 * context is available (e.g. CSV bulk import from CLI-less flows).
 */
export function resolveShopIdSync(): string {
  const db = getDatabase()
  const row = db.prepare('SELECT id FROM shops ORDER BY created_at ASC LIMIT 1').get() as { id: string } | undefined
  return row?.id || 'default'
}

/**
 * Resolve the active shop id, preferring the loaded session.
 * Falls back to the first row in shops, then to 'default'.
 *
 * Note: desktopLoadSession is async, but this helper is sync (most handler
 * sites already have an async context). If the caller is in a sync IPC
 * handler, the session check is skipped — the shops-table fallback still
 * provides a stable scope.
 */
export async function resolveActiveShopId(): Promise<string> {
  try {
    const session = await desktopLoadSession()
    if (session?.shopId) return session.shopId
  } catch {
    // Session loading may fail when no session exists — fall through to DB.
  }
  return resolveShopIdSync()
}
