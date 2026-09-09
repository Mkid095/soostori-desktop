/**
 * cloud-auth-session-handlers.ts — Session management IPC handlers.
 * Part of cloud-auth-ipc-handlers split per ANPAS.
 */

import { ipcMain } from 'electron'
import log from 'electron-log'
import { getCloudAuthSingleton } from './cloud-auth-core'
import { setSession, clearSession } from '../services/cloud-auth'

export function registerCloudAuthSessionHandlers(): void {
  ipcMain.handle('auth:restoreSession', async () => {
    try {
      const auth = getCloudAuthSingleton()
      const session = await auth.restoreSession()
      if (session) {
        setSession({ userId: session.userId, deviceId: session.deviceId, shopId: session.shopId,
          employeeId: session.employeeId, email: session.email })
        return { restored: true, userId: session.userId, email: session.email,
          shopId: session.shopId, employeeId: session.employeeId, deviceId: session.deviceId,
          isStale: auth.isSessionStale }
      }
      return { restored: false }
    } catch (err) { log.warn('[auth:restoreSession]', err); return { restored: false } }
  })

  ipcMain.handle('auth:refreshSession', async () => {
    try {
      const auth = getCloudAuthSingleton()
      const result = await auth.refreshSession()
      return { refreshed: result.ok, error: result.ok ? undefined : result.error?.message }
    } catch (err) { return { refreshed: false, error: String(err) } }
  })

  ipcMain.handle('auth:signOut', async () => {
    try {
      const auth = getCloudAuthSingleton()
      await auth.signOut()
      clearSession()
      return { success: true }
    } catch (err) { log.warn('[auth:signOut]', err); clearSession(); return { success: false } }
  })

  ipcMain.handle('auth:getSession', async () => {
    try {
      const auth = getCloudAuthSingleton()
      const session = auth.session
      return { hasSession: !!session, userId: session?.userId, email: session?.email }
    } catch { return { hasSession: false } }
  })
}
