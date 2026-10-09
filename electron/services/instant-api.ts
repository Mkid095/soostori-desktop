/**
 * instant-api.ts — Low-level HTTP client for FIDScript/InstantDB REST API.
 *
 * Used by desktop (main process) to communicate with apiinstant.fidscript.com.
 * Entity field names match the shared cloud schema used by web and mobile.
 *
 * ─── Why magic-code auth uses REST helpers instead of CloudClient ─────────────
 *
 * `CloudClient` (@soostori/cloud, tested at v0.1.0-alpha.11) does NOT expose
 * magic-code auth on its public surface. Its supported operations are:
 *   query, transact, upsert, getById, health,
 *   shop CRUD, employee CRUD, invitation CRUD + accept,
 *   subscription CRUD, device CRUD.
 *
 * There is NO `sendMagicCode` / `verifyMagicCode` / `auth` namespace.
 * The underlying FIDScript REST API does support magic-code flow, but that
 * surface is intentionally omitted from `CloudClient` — likely to keep the SDK
 * focused on data operations and avoid surfacing auth stateful concerns.
 *
 * Therefore, desktop MUST use direct REST calls for magic-code auth.
 * These helpers (sendMagicCode, verifyMagicCode) are NOT legacy fallback code
 * to be removed — they are the correct and only current path for auth.
 *
 * ─── Re-assessment trigger ───────────────────────────────────────────────────
 *
 * If @soostori/cloud ever adds `sendMagicCode` / `verifyMagicCode` to
 * CloudClient (or a new `CloudAuth` class), migrate the two auth helpers in
 * this file to use CloudClient internally and remove the raw fetch calls.
 * The migration is low-effort: the request shape is identical.
 *
 * ─── Other REST helpers (instaqQuery, instamlTx) ─────────────────────────────
 *
 * These CAN be replaced with CloudClient equivalents today (CloudClient.query /
 * CloudClient.transact). That migration is tracked separately and is low-cost.
 * The auth helpers above are the ones that must stay until CloudClient adds them.
 *
 * ───────────────────────────────────────────────────────────────────────────
 */

const API_URI = process.env.INSTANT_API_URI || 'https://apiinstant.fidscript.com'

export function getApiUrl(path: string): string {
  return `${API_URI}${path}`
}

/** Instaml transaction: create/update/delete entities. */
export async function instamlTx(
  appId: string,
  steps: unknown[][]
): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_URI}/api/v1/apps/${appId}/instaml/tx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ steps }),
  })
  if (!res.ok) throw new Error(`Instaml tx failed: ${res.status}`)
  return res.json() as Promise<Record<string, unknown>>
}

/** InstaQL query. */
export async function instaqQuery(
  appId: string,
  goals: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_URI}/api/v1/apps/${appId}/instaql/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goals }),
  })
  if (!res.ok) throw new Error(`InstaQL query failed: ${res.status}`)
  return res.json() as Promise<Record<string, unknown>>
}

/** Magic code auth endpoint. */
export async function sendMagicCode(email: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_URI}/api/v1/apps/${process.env.INSTANT_APP_ID}/auth/magic-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, type: 'email' }),
    })
    if (res.ok) return { ok: true }
    const err = await res.json().catch(() => ({ error: res.statusText }))
    return { ok: false, error: String(err?.error ?? res.statusText) }
  } catch { return { ok: false, error: 'Network error' } }
}

export async function verifyMagicCode(email: string, code: string): Promise<{
  ok: boolean; userId?: string; email_?: string; error?: string
}> {
  try {
    const res = await fetch(`${API_URI}/api/v1/apps/${process.env.INSTANT_APP_ID}/auth/magic-code/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    })
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
    const data = await res.json() as { user: { id: string; email: string } }
    return { ok: true, userId: data.user.id, email_: data.user.email }
  } catch { return { ok: false, error: 'Network error' } }
}

export { API_URI as INSTANT_API_URI }
