/**
 * fidscript-auth-api.ts — FIDScript REST AuthApiClient.
 * Implements @soostori/auth AuthApiClient over apiinstant.fidscript.com.
 */

import type {
  AuthApiClient, AuthApiResponse, GoogleSignInResult,
  EmailRegistrationResult, EmailVerificationResult, PasswordResetRequestResult,
  PasswordResetCompleteResult, SignInResult, SessionRefreshResult,
  TrustedDevice, TrustedDeviceResult,
} from '@soostori/auth'

const APP_ID = process.env.INSTANT_APP_ID ?? ''
const API_URI = process.env.INSTANT_API_URI ?? 'https://apiinstant.fidscript.com'

function authUrl(path: string): string { return `${API_URI}/api/v1/apps/${APP_ID}/auth${path}` }

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<AuthApiResponse<T>> {
  try {
    const res = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers as Record<string, string> || {}) },
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) return { data: undefined, error: { code: body?.error?.code ?? 'UNKNOWN', message: body?.error?.message ?? res.statusText, retryAfterMs: body?.error?.retryAfterMs } }
    return { data: body as T }
  } catch (err) { return { data: undefined, error: { code: 'NETWORK_OFFLINE', message: String(err) } } }
}

export class FIDScriptAuthApiClient implements AuthApiClient {
  async exchangeGoogleCode(code: string, codeVerifier: string, redirectUri: string): Promise<AuthApiResponse<GoogleSignInResult>> {
    return apiFetch<GoogleSignInResult>(authUrl('/exchange-google-code'), { method: 'POST', body: JSON.stringify({ code, code_verifier: codeVerifier, redirect_uri: redirectUri }) })
  }
  async linkGoogleAccount(idToken: string, sessionAccessToken: string): Promise<AuthApiResponse<GoogleSignInResult>> {
    return apiFetch<GoogleSignInResult>(authUrl('/link-google'), { method: 'POST', headers: { Authorization: `Bearer ${sessionAccessToken}` }, body: JSON.stringify({ id_token: idToken }) })
  }
  async signInWithIdToken(clientName: string, idToken: string): Promise<AuthApiResponse<GoogleSignInResult>> {
    return apiFetch<GoogleSignInResult>(authUrl('/signin-with-id-token'), { method: 'POST', body: JSON.stringify({ client_name: clientName, id_token: idToken }) })
  }
  async registerEmail(email: string, password: string, employeeName: string): Promise<AuthApiResponse<EmailRegistrationResult>> {
    return apiFetch<EmailRegistrationResult>(authUrl('/register'), { method: 'POST', body: JSON.stringify({ email, password, employee_name: employeeName }) })
  }
  async verifyEmail(token: string): Promise<AuthApiResponse<EmailVerificationResult>> {
    return apiFetch<EmailVerificationResult>(authUrl('/verify-email'), { method: 'POST', body: JSON.stringify({ token }) })
  }
  async requestPasswordReset(email: string): Promise<AuthApiResponse<PasswordResetRequestResult>> {
    return apiFetch<PasswordResetRequestResult>(authUrl('/password-reset'), { method: 'POST', body: JSON.stringify({ email }) })
  }
  async completePasswordReset(token: string, newPassword: string): Promise<AuthApiResponse<PasswordResetCompleteResult>> {
    return apiFetch<PasswordResetCompleteResult>(authUrl('/password-reset/complete'), { method: 'POST', body: JSON.stringify({ token, password: newPassword }) })
  }
  async signInEmail(email: string, password: string): Promise<AuthApiResponse<SignInResult>> {
    return apiFetch<SignInResult>(authUrl('/signin'), { method: 'POST', body: JSON.stringify({ email, password }) })
  }
  async refreshSession(refreshToken: string): Promise<AuthApiResponse<SessionRefreshResult>> {
    return apiFetch<SessionRefreshResult>(authUrl('/session/refresh'), { method: 'POST', body: JSON.stringify({ refresh_token: refreshToken }) })
  }
  async revokeSession(accessToken: string): Promise<AuthApiResponse<void>> {
    return apiFetch<void>(authUrl('/session/revoke'), { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } })
  }
  async registerTrustedDevice(deviceToken: string, deviceName: string, accessToken: string): Promise<AuthApiResponse<TrustedDeviceResult>> {
    return apiFetch<TrustedDeviceResult>(authUrl('/trusted-devices'), { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ device_token: deviceToken, device_name: deviceName }) })
  }
  async listTrustedDevices(accessToken: string): Promise<AuthApiResponse<TrustedDevice[]>> {
    return apiFetch<TrustedDevice[]>(authUrl('/trusted-devices'), { method: 'GET', headers: { Authorization: `Bearer ${accessToken}` } })
  }
  async removeTrustedDevice(deviceId: string, accessToken: string): Promise<AuthApiResponse<void>> {
    return apiFetch<void>(authUrl(`/trusted-devices/${deviceId}`), { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } })
  }
}

let _client: FIDScriptAuthApiClient | null = null
export function getAuthApiClient(): FIDScriptAuthApiClient { if (!_client) _client = new FIDScriptAuthApiClient(); return _client }
