/**
 * cloud-auth-ipc-handlers.ts — CloudAuth IPC handler registration.
 * Split per ANPAS: Google → cloud-auth-google-handlers.ts,
 * Session → cloud-auth-session-handlers.ts, shared singleton → cloud-auth-core.ts.
 */

import { ipcMain } from 'electron'
import { registerCloudAuthGoogleHandlers } from './cloud-auth-google-handlers'
import { registerCloudAuthSessionHandlers } from './cloud-auth-session-handlers'
import { getCloudAuthSingleton } from './cloud-auth-core'
import { setNetworkStatus } from '../auth/electron-platform-adapter'
import log from 'electron-log'

export function registerCloudAuthIpcHandlers(): void {
  // Email/password sign-in
  ipcMain.handle('auth:signInWithEmail', async (_event, email: string, password: string) => {
    try {
      const auth = getCloudAuthSingleton()
      const result = await auth.signInWithEmail(email, password)
      if (result.ok) return { success: true, userId: result.data.session.userId,
        email: result.data.session.email, isEmailVerified: result.data.isEmailVerified }
      return { success: false, error: result.error?.message ?? 'Sign-in failed' }
    } catch (err) { log.error('[auth:signInWithEmail]', err); return { success: false, error: String(err) } }
  })

  // Email/password registration
  ipcMain.handle('auth:registerWithEmail', async (_event, email: string, password: string, name: string) => {
    try {
      const auth = getCloudAuthSingleton()
      const result = await auth.registerWithEmail(email, password, name)
      if (result.ok) return { success: true, userId: result.data.userId,
        email: result.data.email, requiresEmailVerification: result.data.requiresEmailVerification }
      return { success: false, error: result.error?.message ?? 'Registration failed' }
    } catch (err) { log.error('[auth:registerWithEmail]', err); return { success: false, error: String(err) } }
  })

  // Email verification
  ipcMain.handle('auth:verifyEmailAddress', async (_event, token: string) => {
    try {
      const auth = getCloudAuthSingleton()
      const result = await auth.verifyEmailAddress(token)
      if (result.ok) return { success: true, userId: result.data.userId, email: result.data.email }
      return { success: false, error: result.error?.message ?? 'Verification failed' }
    } catch (err) { log.error('[auth:verifyEmailAddress]', err); return { success: false, error: String(err) } }
  })

  // Password reset request
  ipcMain.handle('auth:resetPassword', async (_event, email: string) => {
    try {
      const auth = getCloudAuthSingleton()
      const result = await auth.resetPassword(email)
      if (result.ok) return { success: true, resetLinkSent: result.data.resetLinkSent }
      return { success: false, error: result.error?.message ?? 'Reset request failed' }
    } catch (err) { log.error('[auth:resetPassword]', err); return { success: false, error: String(err) } }
  })

  // Complete password reset
  ipcMain.handle('auth:completePasswordReset', async (_event, token: string, newPassword: string) => {
    try {
      const auth = getCloudAuthSingleton()
      const result = await auth.completePasswordReset(token, newPassword)
      if (result.ok) return { success: true, userId: result.data.userId, email: result.data.email }
      return { success: false, error: result.error?.message ?? 'Password reset failed' }
    } catch (err) { log.error('[auth:completePasswordReset]', err); return { success: false, error: String(err) } }
  })

  // Google ID token sign-in (mobile flow)
  ipcMain.handle('auth:signInWithGoogleIdToken', async (_event, params: { idToken: string; clientName: string }) => {
    try {
      const auth = getCloudAuthSingleton()
      const result = await auth.signInWithGoogleIdToken(params)
      if (result.ok) return { success: true, userId: result.data.userId, email: result.data.email,
        isNewUser: result.data.isNewUser }
      return { success: false, error: result.error?.message ?? 'Google ID token sign-in failed' }
    } catch (err) { log.error('[auth:signInWithGoogleIdToken]', err); return { success: false, error: String(err) } }
  })

  // Trusted device management
  ipcMain.handle('auth:registerTrustedDevice', async (_event, deviceName: string) => {
    try {
      const auth = getCloudAuthSingleton()
      const result = await auth.registerTrustedDevice(deviceName)
      if (result.ok) return { success: true, device: result.data.device, deviceToken: result.data.deviceToken }
      return { success: false, error: result.error?.message ?? 'Device registration failed' }
    } catch (err) { log.error('[auth:registerTrustedDevice]', err); return { success: false, error: String(err) } }
  })

  ipcMain.handle('auth:listTrustedDevices', async () => {
    try {
      const auth = getCloudAuthSingleton()
      const result = await auth.listTrustedDevices()
      if (result.ok) return { success: true, devices: result.data }
      return { success: false, error: result.error?.message ?? 'Failed to list devices' }
    } catch (err) { log.error('[auth:listTrustedDevices]', err); return { success: false, error: String(err) } }
  })

  ipcMain.handle('auth:removeTrustedDevice', async (_event, deviceId: string) => {
    try {
      const auth = getCloudAuthSingleton()
      const result = await auth.removeTrustedDevice(deviceId as Parameters<typeof auth.removeTrustedDevice>[0])
      if (result.ok) return { success: true }
      return { success: false, error: result.error?.message ?? 'Failed to remove device' }
    } catch (err) { log.error('[auth:removeTrustedDevice]', err); return { success: false, error: String(err) } }
  })

  ipcMain.on('auth:setNetworkStatus', (_event, isOnline: boolean) => { setNetworkStatus(isOnline) })

  registerCloudAuthGoogleHandlers()
  registerCloudAuthSessionHandlers()
  log.info('CloudAuth IPC handlers registered')
}
