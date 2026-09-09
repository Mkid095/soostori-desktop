import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'
// Phase 11.2 Batch A: route hashPin through the published SDK.
import { hashPin } from '@soostori/auth/pin-node'
// Phase 11.2 Batch B: canonicalize business/identity via the published
// @soostori/business package.
import { BusinessService } from '@soostori/business'
import { asDeviceId, asUserId } from '@soostori/core'
import { DesktopBusinessRepository } from '../services/business'
import { getOrCreateDeviceId } from '../services/store'

export function registerShopHandlers(): void {
  ipcMain.handle('db:shop:create', async (_event, rawData: unknown) => {
    const data = rawData as { shopName: string; ownerName: string; ownerPin: string; currency?: string }
    const db = getDatabase()
    const shopId = uuidv4()
    const userId = uuidv4()
    const ownerPin = data.ownerPin
    const { hash, salt } = hashPin(ownerPin)

    db.prepare(`INSERT INTO shops (id, name, currency, created_at) VALUES (?, ?, ?, ?)`)
      .run(shopId, data.shopName, data.currency || 'KES', new Date().toISOString())

    db.prepare(`
      INSERT INTO employees (id, shop_id, name, pin_hash, pin_salt, role, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, 'owner', 1, ?)
    `).run(userId, shopId, data.ownerName, hash, salt, new Date().toISOString())

    // Phase 11.2 Batch B: emit a domain event through the canonical SDK
    // business service. The service operates on the published contract;
    // the Desktop-side adapter handles persistence in the legacy tables.
    try {
      const repo = new DesktopBusinessRepository()
      const svc = new BusinessService(repo, asDeviceId(getOrCreateDeviceId()))
      await svc.createBusiness({
        name: data.shopName,
        slug: data.shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'shop',
        taxRate: 0,
        currency: data.currency || 'KES',
        ownerPersonId: asUserId(userId),
      })
    } catch (err) {
      log.warn('BusinessService.createBusiness availability event failed (non-fatal):', err)
    }

    log.info(`Shop created: ${shopId}, owner: ${userId}`)
    return {
      shop: db.prepare('SELECT * FROM shops WHERE id = ?').get(shopId),
      user: db.prepare('SELECT id, shop_id, name, role, is_active, created_at FROM employees WHERE id = ?').get(userId),
    }
  })

  ipcMain.handle('db:shop:get', () => {
    const db = getDatabase()
    return db.prepare('SELECT * FROM shops LIMIT 1').get()
  })

  ipcMain.handle('db:shop:getUsers', (_event, shopId: string) => {
    const db = getDatabase()
    return db.prepare('SELECT id, shop_id, name, role, is_active, created_at FROM employees WHERE shop_id = ? AND is_active = 1').all(shopId)
  })

  ipcMain.handle('db:device:getId', () => {
    return { deviceId: getOrCreateDeviceId() }
  })

  log.info('Shop IPC handlers registered')
}
