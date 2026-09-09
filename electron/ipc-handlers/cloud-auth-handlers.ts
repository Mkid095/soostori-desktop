/**
 * cloud-auth-handlers.ts — IPC handlers for cloud authentication.
 */

import { ipcMain } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'
import { getDatabase } from '../database'
import {
  requestMagicCode, verifyMagicCode, setSession, getSession, clearSession,
  setDeviceId, getShopId, getEmployeeId,
} from '../services/cloud-auth'
import { getCloudAuthSingleton } from './cloud-auth-core'
import { syncEmployeesFromCloud, syncShopFromCloud } from '../services/cloud-auth-sync'
import { cloudDownloadInitialSnapshot } from '../services/cloud-snapshot'
import { getSyncStore } from '../services/store'
// Phase 11.2 Batch A: route hashPin through the published SDK.
import { hashPin } from '@soostori/auth/pin-node'
import { dispatchSyncStatus } from '../sync/sync-service-core'

export function registerCloudAuthHandlers(): void {
  ipcMain.handle('cloud:auth:requestMagicCode', (_e, email: string) => requestMagicCode(email))

  ipcMain.handle('cloud:auth:verifyMagicCode', async (_e, email: string, code: string) => {
    const session = await verifyMagicCode(email, code)
    return session ? { success: true, session } : { success: false, error: 'Invalid code' }
  })

  // Register this device in cloud and sync shop/employees
  ipcMain.handle('cloud:auth:registerDevice', async (_e, rawData: unknown) => {
    const data = rawData as { email: string; deviceId: string; deviceName: string; cloudUser: Record<string, unknown>; employeeId: string; employeeName: string }
    try {
      // Update session with device info
      const session = getSession()
      if (session) setDeviceId(data.deviceId)
      else setDeviceId(data.deviceId)

      const store = getSyncStore()
      store.set('deviceId', data.deviceId)
      store.set('cloudDeviceId', data.deviceId)
      store.set('employeeId', data.employeeId)

      // Sync shop and employees from cloud
      const shop = await syncShopFromCloud(data.deviceId)
      if (!shop) return { success: false, error: 'Shop not found in cloud' }
      store.set('shopId', shop.id)

      const employees = await syncEmployeesFromCloud(shop.id)
      if (employees.length > 0) store.set('employeeId', employees[0].id)

      // Download initial snapshot (products, categories, customers) from cloud
      const snapshot = await cloudDownloadInitialSnapshot(shop.id)
      log.info(`Initial snapshot: ${snapshot.total} records downloaded`)

      // Update local device record
      const db = getDatabase()
      db.prepare('UPDATE devices SET cloud_device_id=?, shop_id=?, last_seen=? WHERE id=?')
        .run(data.deviceId, shop.id, new Date().toISOString(), data.deviceId)

      dispatchSyncStatus('online')
      return { success: true, shop, employeeCount: employees.length, snapshot }
    } catch (err) { log.warn('registerDevice failed', err); return { success: false, error: String(err) } }
  })

  ipcMain.handle('cloud:auth:getSession', () => getSession())
  ipcMain.handle('cloud:auth:getDeviceId', () => getSyncStore().get('deviceId'))
  ipcMain.handle('cloud:auth:getShopId', () => getShopId())
  ipcMain.handle('cloud:auth:getEmployeeId', () => getEmployeeId())

  ipcMain.handle('cloud:auth:logout', () => { clearSession(); dispatchSyncStatus('offline'); return { success: true } })

  ipcMain.handle('cloud:auth:syncEmployees', async (_e, shopId?: string) => {
    const resolved = shopId ?? getShopId()
    if (!resolved) return { employees: [], count: 0 }
    const employees = await syncEmployeesFromCloud(resolved)
    return { employees, count: employees.length }
  })

  // Restore previous session on startup — CloudAuth singleton handles both
  // OAuth sessions (stored via @soostori/auth ElectronStoreSessionStorage) and
  // magic-code sessions (stored via cloud-auth.ts getSyncStore).
  // Returns the full canonical identity chain: userId → shopId → employeeId → deviceId.
  ipcMain.handle('cloud:auth:restoreSession', async () => {
    const cloudAuth = getCloudAuthSingleton()
    const cloudSession = await cloudAuth.restoreSession()

    // Magic-code sessions are NOT stored via CloudAuth — check the sync store directly
    const localSession = getSession()
    const session = cloudSession ?? localSession
    if (!session) return { restored: false }

    const store = getSyncStore()
    const db = getDatabase()
    const deviceId = session.deviceId || store.get('deviceId') as string || uuidv4()
    if (!session.deviceId) setDeviceId(deviceId)
    store.set('deviceId', deviceId)

    // Sync employees to populate the identity chain (cloudSession may have empty shopId/employeeId)
    const shopId = session.shopId || getShopId()
    let employeeCount = 0
    if (shopId) {
      try {
        const employees = await syncEmployeesFromCloud(shopId)
        store.set('employeeId', employees[0]?.id ?? '')
        store.set('shopId', shopId)
        employeeCount = employees.length
      } catch { log.warn('Session restore: employee sync failed'); }
    }

    // Ensure local records exist
    const localDevice = db.prepare('SELECT id FROM devices WHERE id = ?').get(deviceId)
    if (!localDevice) {
      const now = new Date().toISOString()
      db.prepare(`INSERT INTO devices (id, shop_id, device_name, device_type, is_online, created_at) VALUES (?, ?, ?, 'desktop', 1, ?)`)
        .run(deviceId, shopId || '', `POS-${session.email.split('@')[0]}`, now)
    }
    db.prepare('INSERT OR IGNORE INTO shops (id, name, currency) VALUES (?, ?, ?)')
      .run(shopId || 'local', 'Shop', 'KES')

    log.info(`Session restored: user=${session.userId}, shop=${shopId}, employees=${employeeCount}, device=${deviceId}`)
    return {
      restored: true,
      userId: session.userId,
      email: session.email,
      shopId: shopId || session.shopId,
      employeeId: store.get('employeeId') as string || '',
      deviceId,
      employeeCount,
    }
  })

  log.info('Cloud auth IPC handlers registered')
}
