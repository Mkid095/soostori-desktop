/**
 * handlers-auth.ts — Preload bridge for @soostori/auth CloudAuth.
 *
 * Exposes CloudAuth methods to the renderer via contextBridge.
 *
 * IMPORTANT: Renderer NEVER has direct access to:
 *   - AuthApiClient (secret REST calls)
 *   - refresh tokens (stored in ElectronSecureStorage)
 *   - code verifiers (security critical)
 *
 * Architecture:
 *   Renderer (UI) → ipcRenderer → preload (CloudAuth wrapper) → main process
 *                                                         ↓
 *                                    ElectronPlatformAuthAdapter + FIDScriptAuthApiClient
 *                                                         ↓
 *                                               ElectronSecureStorage (DPAPI)
 */

import { ipcRenderer } from 'electron'

export interface CloudAuthIpc {
  signInWithGoogle(config: {
    clientId: string
    redirectUri: string
    scopes?: string[]
  }): Promise<{ started: boolean; error?: string }>

  handleOAuthCallback(code: string, state: string, codeVerifier: string, redirectUri: string): Promise<{
    success: boolean
    userId?: string
    email?: string
    isNewUser?: boolean
    error?: string
  }>

  signInWithGoogleIdToken(params: { idToken: string; clientName: string }): Promise<{
    success: boolean
    userId?: string
    email?: string
    isNewUser?: boolean
    error?: string
  }>

  signInWithEmail(email: string, password: string): Promise<{
    success: boolean
    userId?: string
    email?: string
    isEmailVerified?: boolean
    error?: string
  }>

  registerWithEmail(email: string, password: string, name: string): Promise<{
    success: boolean
    userId?: string
    email?: string
    requiresEmailVerification?: boolean
    error?: string
  }>

  verifyEmailAddress(token: string): Promise<{
    success: boolean
    userId?: string
    email?: string
    error?: string
  }>

  resetPassword(email: string): Promise<{
    success: boolean
    resetLinkSent?: boolean
    error?: string
  }>

  completePasswordReset(token: string, newPassword: string): Promise<{
    success: boolean
    userId?: string
    email?: string
    error?: string
  }>

  restoreSession(): Promise<{
    restored: boolean
    userId?: string
    email?: string
    shopId?: string
    employeeId?: string
    deviceId?: string
    isStale?: boolean
  }>

  refreshSession(): Promise<{ refreshed: boolean; error?: string }>

  signOut(): Promise<{ success: boolean }>

  registerTrustedDevice(deviceName: string): Promise<{
    success: boolean
    device?: { deviceId: string; deviceName: string; registeredAt: string; lastUsedAt: string; isAutoApproved: boolean }
    deviceToken?: string
    error?: string
  }>

  listTrustedDevices(): Promise<{
    success: boolean
    devices?: Array<{ deviceId: string; deviceName: string; registeredAt: string; lastUsedAt: string; isAutoApproved: boolean }>
    error?: string
  }>

  removeTrustedDevice(deviceId: string): Promise<{
    success: boolean
    error?: string
  }>

  onAuthEvent(callback: (event: {
    type: string
    userId?: string
    email?: string
    error?: string
  }) => void): () => void

  getSession(): Promise<{
    hasSession: boolean
    userId?: string
    email?: string
  }>

  setNetworkStatus(isOnline: boolean): void
}

let _unsubscribe: (() => void) | null = null

export function exposeAuthHandlers(): void {
  const handlers: CloudAuthIpc = {
    signInWithGoogle: (config) =>
      ipcRenderer.invoke('auth:signInWithGoogle', config),

    handleOAuthCallback: (code, state, codeVerifier, redirectUri) =>
      ipcRenderer.invoke('auth:handleOAuthCallback', code, state, codeVerifier, redirectUri),

    signInWithGoogleIdToken: (params) =>
      ipcRenderer.invoke('auth:signInWithGoogleIdToken', params),

    signInWithEmail: (email, password) =>
      ipcRenderer.invoke('auth:signInWithEmail', email, password),

    registerWithEmail: (email, password, name) =>
      ipcRenderer.invoke('auth:registerWithEmail', email, password, name),

    verifyEmailAddress: (token) =>
      ipcRenderer.invoke('auth:verifyEmailAddress', token),

    resetPassword: (email) =>
      ipcRenderer.invoke('auth:resetPassword', email),

    completePasswordReset: (token, newPassword) =>
      ipcRenderer.invoke('auth:completePasswordReset', token, newPassword),

    restoreSession: () =>
      ipcRenderer.invoke('auth:restoreSession'),

    refreshSession: () =>
      ipcRenderer.invoke('auth:refreshSession'),

    signOut: () =>
      ipcRenderer.invoke('auth:signOut'),

    registerTrustedDevice: (deviceName) =>
      ipcRenderer.invoke('auth:registerTrustedDevice', deviceName),

    listTrustedDevices: () =>
      ipcRenderer.invoke('auth:listTrustedDevices'),

    removeTrustedDevice: (deviceId) =>
      ipcRenderer.invoke('auth:removeTrustedDevice', deviceId),

    onAuthEvent: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, data: Parameters<typeof callback>[0]) => {
        callback(data)
      }
      ipcRenderer.on('auth:event', handler)
      const unsubscribe = () => ipcRenderer.removeListener('auth:event', handler)
      _unsubscribe = unsubscribe
      return unsubscribe
    },

    getSession: () =>
      ipcRenderer.invoke('auth:getSession'),

    setNetworkStatus: (isOnline) =>
      ipcRenderer.send('auth:setNetworkStatus', isOnline),
  }

  // Expose as cloudAuthSdk to avoid colliding with old cloudAuth
  ;(window as unknown as { cloudAuthSdk: CloudAuthIpc }).cloudAuthSdk = handlers
}
