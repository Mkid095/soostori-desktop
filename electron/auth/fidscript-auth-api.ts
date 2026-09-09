/**
 * fidscript-auth-api.ts — FIDScript REST AuthApiClient.
 * Implements @soostori/auth AuthApiClient over apiinstant.fidscript.com.
 *
 * Canonical identity chain:
 *   FIDScript User ($users)
 *     ↓
 *   Shop (shops)
 *     ↓
 *   Employee (employees)
 *     ↓
 *   Device (devices)
 *     ↓
 *   Authorized Session
 *
 * Local PIN is NOT a cloud identity. It only unlocks an already-authorized
 * employee on a specific device. PIN verifier lives in EncryptedStorage (device-local).
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
function enrollmentUrl(path: string): string { return `${API_URI}/api/v1/apps/${APP_ID}/enrollment${path}` }

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
  // ── OAuth / Identity ────────────────────────────────────────────────

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

  // ── Device enrollment (PIN) ─────────────────────────────────────────

  /**
   * Get current device enrollment status for a shop.
   */
  async getDeviceStatus(shopId: string, deviceId: string): Promise<AuthApiResponse<{ exists: boolean; hasPin: boolean }>> {
    return apiFetch<{ exists: boolean; hasPin: boolean }>(enrollmentUrl('/status'), {
      method: 'POST',
      body: JSON.stringify({ shop_id: shopId, device_id: deviceId }),
    })
  }

  /**
   * Register a new device for this shop in FIDScript.
   */
  async createDeviceEnrollment(shopId: string, deviceId: string, deviceName: string): Promise<AuthApiResponse<{ deviceId: string; hasPin: boolean }>> {
    return apiFetch<{ deviceId: string; hasPin: boolean }>(enrollmentUrl('/create'), {
      method: 'POST',
      body: JSON.stringify({ shop_id: shopId, device_id: deviceId, device_name: deviceName }),
    })
  }

  /**
   * Verify PIN for cross-device enrollment.
   * Device B derives proof = PBKDF2(pin, canonical_salt_from_backend).
   */
  async verifyPinForEnrollment(
    employeeId: string,
    pinProof: string,
    shopId: string,
    deviceId: string,
  ): Promise<AuthApiResponse<{ enrollmentToken: string; expiresAt: string }>> {
    return apiFetch<{ enrollmentToken: string; expiresAt: string }>(enrollmentUrl('/verify-pin'), {
      method: 'POST',
      body: JSON.stringify({ employee_id: employeeId, pin_proof: pinProof, shop_id: shopId, device_id: deviceId }),
    })
  }

  /**
   * Consume enrollment token — atomic validation + invalidation.
   * Stores newPinVerifier as canonical verifier for employee.
   */
  async consumeEnrollmentToken(params: {
    enrollmentToken: string
    employeeId: string
    shopId: string
    deviceId: string
    newPinVerifier: string
    newPinSalt: string
  }): Promise<AuthApiResponse<{ success: true }>> {
    return apiFetch<{ success: true }>(enrollmentUrl('/consume-token'), {
      method: 'POST',
      body: JSON.stringify({
        enrollment_token: params.enrollmentToken,
        employee_id: params.employeeId,
        shop_id: params.shopId,
        device_id: params.deviceId,
        new_pin_verifier: params.newPinVerifier,
        new_pin_salt: params.newPinSalt,
      }),
    })
  }

  /**
   * Change PIN when already authenticated with existing PIN.
   */
  async changePin(params: {
    employeeId: string
    shopId: string
    deviceId: string
    oldPinProof: string
    newPinVerifier: string
    newPinSalt: string
  }): Promise<AuthApiResponse<{ success: true }>> {
    return apiFetch<{ success: true }>(enrollmentUrl('/change-pin'), {
      method: 'POST',
      body: JSON.stringify({
        employee_id: params.employeeId,
        shop_id: params.shopId,
        device_id: params.deviceId,
        old_pin_proof: params.oldPinProof,
        new_pin_verifier: params.newPinVerifier,
        new_pin_salt: params.newPinSalt,
      }),
    })
  }

  // ── PIN recovery ────────────────────────────────────────────────────

  /**
   * Initiate PIN recovery. Sends 6-digit code to employee's email.
   */
  async requestPinRecovery(employeeId: string): Promise<AuthApiResponse<{ cooldownSeconds: number }>> {
    return apiFetch<{ cooldownSeconds: number }>(enrollmentUrl('/pin-recovery/request'), {
      method: 'POST',
      body: JSON.stringify({ employee_id: employeeId }),
    })
  }

  /**
   * Verify the recovery code. Returns short-lived recovery auth token (JWT).
   */
  async verifyPinRecoveryCode(employeeId: string, code: string): Promise<AuthApiResponse<{ recoveryAuthToken: string; expiresAt: string }>> {
    return apiFetch<{ recoveryAuthToken: string; expiresAt: string }>(enrollmentUrl('/pin-recovery/verify'), {
      method: 'POST',
      body: JSON.stringify({ employee_id: employeeId, code }),
    })
  }

  /**
   * Reset PIN using recovery auth token.
   */
  async resetPin(params: {
    recoveryAuthToken: string
    employeeId: string
    newPinVerifier: string
    newPinSalt: string
  }): Promise<AuthApiResponse<{ success: true }>> {
    return apiFetch<{ success: true }>(enrollmentUrl('/pin-recovery/reset'), {
      method: 'POST',
      body: JSON.stringify({
        recovery_auth_token: params.recoveryAuthToken,
        employee_id: params.employeeId,
        new_pin_verifier: params.newPinVerifier,
        new_pin_salt: params.newPinSalt,
      }),
    })
  }

  // ── Device management ────────────────────────────────────────────────

  /**
   * List all devices enrolled for an employee in a shop.
   */
  async listEnrolledDevices(employeeId: string, shopId: string): Promise<AuthApiResponse<Array<{
    deviceId: string
    deviceName: string
    deviceType: string
    hasPin: boolean
    lastSeenAt: string | null
    authorizedAt: string | null
  }>>> {
    return apiFetch(enrollmentUrl('/devices'), {
      method: 'POST',
      body: JSON.stringify({ employee_id: employeeId, shop_id: shopId }),
    })
  }

  /**
   * Revoke a device's PIN session — forces re-enrollment.
   */
  async revokeDevice(employeeId: string, deviceId: string): Promise<AuthApiResponse<{ success: true }>> {
    return apiFetch<{ success: true }>(enrollmentUrl('/revoke'), {
      method: 'POST',
      body: JSON.stringify({ employee_id: employeeId, device_id: deviceId }),
    })
  }

  // ── Subscriptions ────────────────────────────────────────────────────

  /**
   * Get subscription status for a shop — used to gate device enrollment.
   */
  async getSubscriptionStatus(shopId: string): Promise<AuthApiResponse<{
    status: 'active' | 'past_due' | 'expired' | 'cancelled' | 'trialing'
    planKey: string
    deviceLimit: number
    currentPeriodEnd: string
    currentDeviceCount: number
  }>> {
    return apiFetch(enrollmentUrl('/subscription-status'), {
      method: 'POST',
      body: JSON.stringify({ shop_id: shopId }),
    })
  }
}

let _client: FIDScriptAuthApiClient | null = null
export function getAuthApiClient(): FIDScriptAuthApiClient { if (!_client) _client = new FIDScriptAuthApiClient(); return _client }
