/**
 * instant-api.ts — Low-level HTTP client for the self-hosted InstantDB API.
 * Wraps Instaml transactions and InstaQL queries.
 */

const API_URI = process.env.INSTANT_API_URI || 'https://apiinstant.fidscript.com'

export function getApiUrl(path: string): string {
  return `${API_URI}${path}`
}

/** Instaml transaction: create/update/delete entities in InstantDB. */
export async function instamlTx(
  appId: string,
  steps: unknown[]
): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_URI}/api/v1/apps/${appId}/instaml/tx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ steps, label: 'desktop-sync' }),
  })
  if (!res.ok) throw new Error(`Instaml tx failed: ${res.status}`)
  return res.json() as Promise<Record<string, unknown>>
}

/** InstaQL query: read data from InstantDB. */
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

export { API_URI as INSTANT_API_URI }
