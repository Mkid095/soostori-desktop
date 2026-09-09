/**
 * cloud-auth-core.ts — Shared CloudAuth singleton factory.
 * Part of cloud-auth-ipc-handlers split per ANPAS.
 */

import { BrowserWindow } from 'electron'
import { CloudAuth } from '@soostori/auth'
import { DesktopCloudAuth } from '../auth/desktop-cloud-auth'
import type { AuthEvent } from '@soostori/auth'
import { getPlatformAdapter } from '../auth/electron-platform-adapter'
import { getAuthApiClient } from '../auth/fidscript-auth-api'

let _cloudAuth: CloudAuth | null = null

export function getCloudAuthSingleton(): CloudAuth {
  if (!_cloudAuth) {
    _cloudAuth = new DesktopCloudAuth(getPlatformAdapter(), getAuthApiClient())
    _cloudAuth.on((event: AuthEvent) => {
      const payload: Record<string, unknown> = { type: event.type }
      if ('session' in event && event.session) { payload.userId = event.session.userId; payload.email = event.session.email }
      if ('userId' in event) payload.userId = event.userId
      if ('email' in event) payload.email = event.email
      if ('error' in event) payload.error = event.error
      BrowserWindow.getAllWindows().forEach(w => w.webContents.send('auth:event', payload))
    })
  }
  return _cloudAuth
}
