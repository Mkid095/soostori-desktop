/**
 * cloud-auth-google-handlers.ts — Google OAuth IPC handlers.
 * Part of cloud-auth-ipc-handlers split per ANPAS.
 */

import { ipcMain } from 'electron'
import log from 'electron-log'
import { CloudAuth } from '@soostori/auth'
import type { AuthEvent } from '@soostori/auth'
import { getPlatformAdapter } from '../auth/electron-platform-adapter'
import { getAuthApiClient } from '../auth/fidscript-auth-api'
import { getCloudAuthSingleton } from './cloud-auth-core'

export function registerCloudAuthGoogleHandlers(): void {
  ipcMain.handle('auth:signInWithGoogle', async (_event, config: {
    clientId: string; redirectUri: string; scopes?: string[]
  }) => {
    try {
      const auth = getCloudAuthSingleton()
      const result = await auth.signInWithGoogle({
        clientId: config.clientId,
        redirectUri: config.redirectUri,
        scopes: config.scopes,
      })
      return { started: result.ok, error: result.ok ? undefined : result.error?.message }
    } catch (err) {
      log.error('[auth:signInWithGoogle]', err)
      return { started: false, error: String(err) }
    }
  })

  ipcMain.handle('auth:handleOAuthCallback',
    async (_event, code: string, state: string, codeVerifier: string, redirectUri: string) => {
      try {
        const auth = getCloudAuthSingleton()
        const result = await auth.handleOAuthCallback({ state, code }, codeVerifier, redirectUri)
        if (result.ok) return { success: true, userId: result.data.userId, email: result.data.email, isNewUser: result.data.isNewUser }
        return { success: false, error: result.error?.message ?? 'OAuth exchange failed' }
      } catch (err) {
        log.error('[auth:handleOAuthCallback]', err)
        return { success: false, error: String(err) }
      }
    },
  )
}
