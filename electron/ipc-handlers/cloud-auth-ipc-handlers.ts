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
  // Email/password — lives here since it's the only non-Google method
  ipcMain.handle('auth:signInWithEmail', async (_event, email: string, password: string) => {
    try {
      const auth = getCloudAuthSingleton()
      const result = await auth.signInWithEmail(email, password)
      if (result.ok) return { success: true, userId: result.data.session.userId,
        email: result.data.session.email, isEmailVerified: result.data.isEmailVerified }
      return { success: false, error: result.error?.message ?? 'Sign-in failed' }
    } catch (err) { log.error('[auth:signInWithEmail]', err); return { success: false, error: String(err) } }
  })

  ipcMain.on('auth:setNetworkStatus', (_event, isOnline: boolean) => { setNetworkStatus(isOnline) })

  registerCloudAuthGoogleHandlers()
  registerCloudAuthSessionHandlers()
  log.info('CloudAuth IPC handlers registered')
}
