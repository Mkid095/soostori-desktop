/**
 * mpesa-stk-push.ts — PayHero STK Push integration.
 *
 * Initiates an M-Pesa STK push request via PayHero and polls for completion.
 * (onSTKCallback lives in callback-server.ts — called directly, not via IPC.)
 */

import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'
import type { STKStatus, STKPushResult } from './mpesa-stk-types'

const PAYHERO_API_KEY = process.env.PAYHERO_API_KEY || ''
const PAYHERO_API_URL = 'https://payhero.io/api/payment'
const CALLBACK_BASE = process.env.PAYHERO_CALLBACK_URL || 'http://localhost:18793/api/mpesa/callback'

// ── SQLite helpers ──────────────────────────────────────────────────────────────

function upsertSTKState(
  id: string,
  checkoutRequestId: string,
  phone: string,
  amount: number,
  status: STKStatus,
): void {
  const db = getDatabase()
  const now = new Date().toISOString()
  const existing = db.prepare('SELECT id FROM stk_push_state WHERE id = ?').get(id)
  if (existing) {
    db.prepare(`
      UPDATE stk_push_state
      SET status = ?, completed_at = ?
      WHERE id = ?
    `).run(status, status !== 'pending' ? now : null, id)
  } else {
    db.prepare(`
      INSERT INTO stk_push_state (id, checkout_request_id, phone, amount, status, created_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, checkoutRequestId, phone, amount, status, now, status !== 'pending' ? now : null)
  }
}

// ── PayHero API ────────────────────────────────────────────────────────────────

async function payheroPOST(body: Record<string, string | number>): Promise<unknown> {
  const res = await fetch(PAYHERO_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PAYHERO_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PayHero API error ${res.status}: ${text}`)
  }
  return res.json()
}

async function payheroGET(checkoutRequestId: string): Promise<unknown> {
  const res = await fetch(`${PAYHERO_API_URL}/${checkoutRequestId}`, {
    headers: { 'Authorization': `Bearer ${PAYHERO_API_KEY}` },
  })
  if (!res.ok) throw new Error(`PayHero GET error ${res.status}`)
  return res.json()
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Initiate an M-Pesa STK push request.
 * Returns the local id and PayHero checkoutRequestId.
 */
export async function initiateSTKPush(
  phone: string,
  amount: number,
  accountRef: string,
): Promise<STKPushResult> {
  if (!PAYHERO_API_KEY) throw new Error('PAYHERO_API_KEY not configured')

  const id = uuidv4()
  const callbackUrl = `${CALLBACK_BASE}?id=${id}`

  const body: Record<string, string | number> = {
    phone,
    amount,
    account_reference: accountRef,
    transaction_description: `Soostori POS ${accountRef}`,
    callback_url: callbackUrl,
  }

  log.info(`[STK] Initiating push: phone=${phone} amount=${amount} accountRef=${accountRef}`)

  try {
    const response = await payheroPOST(body) as Record<string, string>
    const checkoutRequestId = response.checkout_request_id ?? response.id ?? id
    upsertSTKState(id, checkoutRequestId, phone, amount, 'pending')
    log.info(`[STK] Initiated: id=${id} checkoutRequestId=${checkoutRequestId}`)
    return { id, checkoutRequestId, status: 'pending' }
  } catch (err) {
    log.error('[STK] Initiation failed:', err)
    upsertSTKState(id, id, phone, amount, 'failed')
    throw err
  }
}

/**
 * Poll the status of an STK push request.
 * Queries PayHero for the current status of the checkoutRequestId.
 */
export async function pollSTKStatus(id: string, checkoutRequestId: string): Promise<STKStatus> {
  const db = getDatabase()
  const row = db.prepare(
    'SELECT status, created_at FROM stk_push_state WHERE id = ?'
  ).get(id) as { status: STKStatus; created_at: string } | undefined

  if (!row) return 'failed'
  if (row.status === 'completed' || row.status === 'failed' || row.status === 'timeout') return row.status

  // Timeout after 60 seconds
  if (Date.now() - new Date(row.created_at).getTime() > 60_000) {
    upsertSTKState(id, checkoutRequestId, '', 0, 'timeout')
    return 'timeout'
  }

  try {
    const result = await payheroGET(checkoutRequestId) as Record<string, string>
    const statusStr = (result.status ?? '').toLowerCase()
    let status: STKStatus = 'pending'
    if (statusStr === 'completed' || statusStr === 'success' || statusStr === 'paid') {
      status = 'completed'
    } else if (statusStr === 'failed' || statusStr === 'cancelled' || statusStr === 'timeout') {
      status = 'failed'
    }
    upsertSTKState(id, checkoutRequestId, '', 0, status)
    log.info(`[STK] Poll result: id=${id} status=${status}`)
    return status
  } catch (err) {
    log.warn(`[STK] Poll error for ${id}:`, err)
    return row.status
  }
}
