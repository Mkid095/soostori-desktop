/**
 * cloud-data-handlers.ts — Cloud data pull IPC handlers.
 * Part of cloud-handlers split per ANPAS (≤150 lines per file).
 */

import { ipcMain } from 'electron'
import * as cloudSync from '../services/cloud-sync'
import { pullProducts, pullCategories, pullCustomers } from '../services/cloud-entity-sync'
import { dispatchCloudStatus } from './cloud-status-dispatch'
import log from 'electron-log'

async function getCurrentShopId(): Promise<string> {
  try {
    const { desktopLoadSession } = await import('../auth/electron-store-session')
    const session = await desktopLoadSession()
    if (session?.shopId) return session.shopId
  } catch { /* session not available */ }
  try {
    const { getDatabase } = await import('../database')
    const row = getDatabase().prepare('SELECT id FROM shops LIMIT 1').get() as { id: string } | undefined
    if (row) return row.id
  } catch { /* db not ready */ }
  return ''
}

export function registerCloudDataHandlers(): void {
  ipcMain.handle('cloud:syncEvents', async () => {
    const appId = process.env.INSTANT_APP_ID
    if (!appId) return { pushed: 0 }
    dispatchCloudStatus('syncing')
    try {
      const count = await cloudSync.pushSyncEvents()
      dispatchCloudStatus('online')
      log.info(`cloud:syncEvents pushed ${count}`)
      return { pushed: count }
    } catch (err) {
      dispatchCloudStatus('offline')
      log.warn('cloud:syncEvents failed', err)
      return { pushed: 0 }
    }
  })

  ipcMain.handle('cloud:syncShopSettings', async () => {
    dispatchCloudStatus('syncing')
    try {
      await cloudSync.pushShopSettings()
      dispatchCloudStatus('online')
      return { success: true }
    } catch (err) {
      dispatchCloudStatus('offline')
      log.warn('cloud:syncShopSettings failed', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('cloud:pullShopSettings', async () => {
    dispatchCloudStatus('syncing')
    try {
      const ok = await cloudSync.pullShopSettings()
      dispatchCloudStatus('online')
      return { success: ok }
    } catch (err) {
      dispatchCloudStatus('offline')
      log.warn('cloud:pullShopSettings failed', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('cloud:fullSync', async () => {
    dispatchCloudStatus('syncing')
    try {
      await cloudSync.pushFullSnapshot()
      dispatchCloudStatus('online')
      return { success: true }
    } catch (err) {
      dispatchCloudStatus('offline')
      log.warn('cloud:fullSync failed', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('cloud:pullProducts', async () => {
    dispatchCloudStatus('syncing')
    try {
      const count = await pullProducts(await getCurrentShopId())
      dispatchCloudStatus('online')
      return { success: true, count }
    } catch (err) {
      dispatchCloudStatus('offline')
      log.warn('cloud:pullProducts failed', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('cloud:pullCategories', async () => {
    dispatchCloudStatus('syncing')
    try {
      const count = await pullCategories(await getCurrentShopId())
      dispatchCloudStatus('online')
      return { success: true, count }
    } catch (err) {
      dispatchCloudStatus('offline')
      log.warn('cloud:pullCategories failed', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('cloud:pullCustomers', async () => {
    dispatchCloudStatus('syncing')
    try {
      const count = await pullCustomers(await getCurrentShopId())
      dispatchCloudStatus('online')
      return { success: true, count }
    } catch (err) {
      dispatchCloudStatus('offline')
      log.warn('cloud:pullCustomers failed', err)
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('cloud:pullAll', async () => {
    dispatchCloudStatus('syncing')
    try {
      const shopId = await getCurrentShopId()
      const [pCount, cCount, cuCount] = await Promise.all([
        pullProducts(shopId), pullCategories(shopId), pullCustomers(shopId),
      ])
      dispatchCloudStatus('online')
      return { success: true, counts: { products: pCount, categories: cCount, customers: cuCount } }
    } catch (err) {
      dispatchCloudStatus('offline')
      log.warn('cloud:pullAll failed', err)
      return { success: false, error: String(err) }
    }
  })

  log.info('Cloud data IPC handlers registered')
}
