/**
 * instant-api.ts — Low-level HTTP client for FIDScript/InstantDB REST API.
 *
 * Used by desktop (main process) to communicate with apiinstant.fidscript.com.
 * Entity field names match the shared cloud schema used by web and mobile.
 *
 * ─── @soostori/cloud replacement assessment ─────────────────────────────────
 *
 * `@soostori/cloud`'s CloudClient covers InstaQL queries, Instaml transactions,
 * upsert, getById, and health — all the same REST endpoints used here.
 * Migration is feasible: replace the three helpers below with a CloudClient
 * instance (token managed via setToken/getToken), which gives a typed,
 * timeout-aware SDK with the same network behaviour.
 *
 * Gaps vs. current implementation:
 *   1. Magic-code auth (sendMagicCode / verifyMagicCode) is not exposed on
 *      CloudClient's public surface, though the underlying API supports it.
 *      Desktop would need thin wrappers around CloudClient.request() or a
 *      separate auth helper — same effort as keeping instant-api.ts.
 *   2. WebSocket realtime is not implemented in CloudClient. If realtime
 *      subscriptions are added later, that would be net-new on top of CloudClient.
 *   3. Shop sync and employee sync custom endpoints (desktop-specific REST
 *      helpers not in the SDK) would need to stay as custom helpers or be
 *      folded into a desktop-specific CloudClient subclass.
 *
 * Migration cost: LOW. CloudClient can replace the InstaQL/Instaml helpers
 * with a one-line-per-call swap. The auth helpers and custom sync endpoints
 * need small wrappers. WebSocket realtime is a future item. Recommended: replace
 * instaqQuery and instamlTx with CloudClient equivalents in a follow-up PR,
 * keeping the auth helpers here until CloudClient exposes them natively.
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
