/**
 * cloud-auth-handlers.ts — IPC handlers for cloud authentication.
 */

import { ipcMain } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'
import { getDatabase } from '../database'
import {
  requestMagicCode, verifyMagicCode, registerDevice,
  checkCloudSubscription, setSession, getSession, clearSession,
} from '../services/cloud-auth'
import { syncEmployeesFromCloud, syncShopFromCloud } from '../services/cloud-auth-sync'
import { getSyncStore } from '../services/store'
import { hashPin } from '../database/pin-hash'
import { dispatchSyncStatus } from '../sync/sync-service-core'

export function registerCloudAuthHandlers(): void {
  ipcMain.handle('cloud:auth:requestMagicCode', (_e, email: string) => requestMagicCode(email))

  ipcMain.handle('cloud:auth:verifyMagicCode', async (_e, email: string, code: string) => {
    const session = await verifyMagicCode(email, code)
    return session ? { success: true, session } : { success: false, error: 'Invalid code' }
  })

  ipcMain.handle('cloud:auth:registerDevice', async (_e, rawData: unknown) => {
    const data = rawData as { email: string; deviceId: string; deviceName: string; cloudUser: Record<string, unknown>; employeeId: string; employeeName: string }
    try {
      const session = await registerDevice(data.cloudUser as any, data.deviceId, data.deviceName, data.employeeId, data.employeeName)
      setSession(session)
      const store = getSyncStore()
      store.set('cloudDeviceId', session.deviceId)
      store.set('shopId', session.shopId)
      store.set('employeeId', data.employeeId)
      const shop = await syncShopFromCloud(session.deviceId)
      if (!shop) return { success: false, error: 'Shop not found in cloud' }
      store.set('shopId', shop.id)
      const employees = await syncEmployeesFromCloud(shop.id)
      const db = getDatabase()
      db.prepare('UPDATE devices SET cloud_device_id=?, shop_id=?, last_seen=? WHERE id=?')
        .run(session.deviceId, shop.id, new Date().toISOString(), data.deviceId)
      dispatchSyncStatus('online')
      return { success: true, session, shop, employeeCount: employees.length }
    } catch (err) { log.warn('registerDevice failed', err); return { success: false, error: String(err) } }
  })

  ipcMain.handle('cloud:auth:getSession', () => getSession())
  ipcMain.handle('cloud:auth:logout', () => { clearSession(); dispatchSyncStatus('offline'); return { success: true } })
  ipcMain.handle('cloud:auth:syncEmployees', async (_e, shopId?: string) => {
    const store = getSyncStore()
    const resolvedShopId = shopId ?? (store.get('shopId') as string)
    if (!resolvedShopId) return { employees: [], count: 0 }
    const employees = await syncEmployeesFromCloud(resolvedShopId)
    return { employees, count: employees.length }
  })
  ipcMain.handle('cloud:auth:subscription', async (_e, shopId?: string) => {
    const store = getSyncStore()
    const resolvedShopId = shopId ?? (store.get('shopId') as string)
    if (!resolvedShopId) return { valid: true, plan: 'trial', deviceLimit: null, expiryDate: null }
    return checkCloudSubscription(resolvedShopId)
  })
  ipcMain.handle('cloud:auth:getEmployees', (_e, shopId?: string) => {
    // This is handled by db:shop:getUsers which reads from local SQLite
    return []
  })

  // Restore previous session on startup
  ipcMain.handle('cloud:auth:restoreSession', async () => {
    const session = getSession()
    if (!session) return { restored: false }
    const db = getDatabase()
    const store = getSyncStore()
    const localDevice = db.prepare('SELECT id FROM devices WHERE id = ?').get(session.deviceId)
    if (!localDevice) {
      const now = new Date().toISOString()
      db.prepare(`INSERT INTO devices (id, shop_id, device_name, device_type, is_online, created_at) VALUES (?, ?, ?, 'desktop', 1, ?)`)
        .run(session.deviceId, session.shopId, `POS-${session.email.split('@')[0]}`, now)
    }
    db.prepare('INSERT OR IGNORE INTO shops (id, name, currency) VALUES (?, ?, ?)')
      .run(session.shopId, 'Shop', 'KES')
    try {
      const employees = await syncEmployeesFromCloud(session.shopId)
      store.set('employeeId', employees[0]?.id ?? '')
      log.info(`Session restored: ${employees.length} employees`)
      return { restored: true, employeeCount: employees.length }
    } catch { log.warn('Session restore: employee sync failed'); return { restored: true, employeeCount: 0 } }
  })

  log.info('Cloud auth IPC handlers registered')
}
