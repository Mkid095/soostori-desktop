import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'
import { registerDeviceSchema, requestPairingSchema } from './validation'

interface PrimaryDeviceState {
  primaryId: string | null
  electedAt: string | null
  lastHeartbeatAt: string | null
  stalenessMs: number
  status: 'online' | 'stale' | 'lost'
  electionPending: boolean
}

export function registerDeviceHandlers(): void {
  ipcMain.handle('db:devices:list', (_event, shopId: string) => {
    const db = getDatabase()
    return db.prepare('SELECT * FROM devices WHERE shop_id = ? ORDER BY created_at DESC').all(shopId)
  })

  ipcMain.handle('db:devices:register', (_event, rawData: unknown) => {
    const data = registerDeviceSchema.parse(rawData)
    const db = getDatabase()
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO devices (id, shop_id, employee_id, device_name, device_type, capabilities, is_online, last_seen, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(data.deviceId, data.shopId, data.employeeId || null, data.deviceName || 'POS', data.deviceType || 'desktop',
      data.capabilities || '{"sales":true,"inventory":true,"printing":true}', now, now)
    log.info(`Device registered: ${data.deviceId}`)
    return db.prepare('SELECT * FROM devices WHERE id = ?').get(data.deviceId)
  })

  ipcMain.handle('db:devices:heartbeat', (_event, deviceId: string) => {
    const db = getDatabase()
    db.prepare('UPDATE devices SET is_online = 1, last_seen = ? WHERE id = ?').run(new Date().toISOString(), deviceId)
    return { success: true }
  })

  ipcMain.handle('db:devices:setHost', (_event, deviceId: string, shopId: string) => {
    const db = getDatabase()
    db.prepare('UPDATE devices SET is_host = 0 WHERE shop_id = ?').run(shopId)
    db.prepare('UPDATE devices SET is_host = 1 WHERE id = ?').run(deviceId)
    log.info(`Device ${deviceId} promoted to host for shop ${shopId}`)
    return { success: true }
  })

  ipcMain.handle('db:devices:requestPairing', (_event, rawData: unknown) => {
    const data = requestPairingSchema.parse(rawData)
    const db = getDatabase()
    const id = uuidv4()
    const now = new Date().toISOString()
    // Check for existing pending pairing for this device
    const existing = db.prepare(
      "SELECT id, token FROM device_pairings WHERE device_id = ? AND status = 'pending' AND created_at > datetime(?, '-1 hour')"
    ).get(data.deviceId, now)
    if (existing) {
      const e = existing as { id: string; token: string }
      return { pairingId: e.id, token: e.token, alreadyExists: true }
    }
    const token = uuidv4()
    db.prepare(`
      INSERT INTO device_pairings (id, shop_id, device_id, requested_by, status, token, created_at)
      VALUES (?, ?, ?, ?, 'pending', ?, ?)
    `).run(id, data.shopId, data.deviceId, data.requestedBy, token, now)
    log.info(`Pairing requested: ${id} by ${data.requestedBy} (device=${data.deviceName || data.deviceId})`)
    return { pairingId: id, token, alreadyExists: false }
  })

  ipcMain.handle('db:devices:approvePairing', (_event, pairingId: string, approvedBy: string) => {
    const db = getDatabase()
    const pairing = db.prepare('SELECT * FROM device_pairings WHERE id = ?').get(pairingId) as {
      id: string; shop_id: string; device_id: string; status: string; token: string
    } | undefined
    if (!pairing) throw new Error('Pairing not found')
    if (pairing.status !== 'pending') throw new Error(`Pairing already ${pairing.status}`)

    const token = uuidv4()
    const now = new Date().toISOString()
    // Update pairing record
    db.prepare("UPDATE device_pairings SET status = 'approved', approved_by = ?, token = ? WHERE id = ?")
      .run(approvedBy, token, pairingId)
    // Update the device with the connection token
    db.prepare('UPDATE devices SET is_online = 1, last_seen = ?, connection_token = ? WHERE id = ?')
      .run(now, token, pairing.device_id)
    log.info(`Pairing approved: ${pairingId}, device ${pairing.device_id} received connection token`)
    return { success: true, token }
  })

  ipcMain.handle('db:devices:rejectPairing', (_event, pairingId: string) => {
    const db = getDatabase()
    db.prepare("UPDATE device_pairings SET status = 'rejected' WHERE id = ? AND status = 'pending'").run(pairingId)
    log.info(`Pairing rejected: ${pairingId}`)
    return { success: true }
  })

  ipcMain.handle('db:devices:getPairings', (_event, shopId: string) => {
    const db = getDatabase()
    return db.prepare('SELECT * FROM device_pairings WHERE shop_id = ? ORDER BY created_at DESC').all(shopId)
  })

  // Get connection token for an approved device
  ipcMain.handle('db:devices:getConnectionToken', (_event, deviceId: string) => {
    const db = getDatabase()
    const row = db.prepare('SELECT connection_token FROM devices WHERE id = ?').get(deviceId) as { connection_token: string | null } | undefined
    if (!row || !row.connection_token) throw new Error('No connection token — device not paired or not approved')
    return { token: row.connection_token }
  })

  // Get Primary Device state and canAuthorStockOps — mirrors SDK PrimaryDeviceCoordinator logic
  // CRITICAL: canAuthorStockOps returns true ONLY when status === 'online'
  ipcMain.handle('db:devices:getPrimaryState', (_event, shopId: string) => {
    const db = getDatabase()
    const primary = db.prepare(
      'SELECT id, last_seen FROM devices WHERE is_host = 1 AND shop_id = ? LIMIT 1',
    ).get(shopId) as { id: string; last_seen: string | null } | undefined
    if (!primary) {
      return { primaryId: null, electedAt: null, lastHeartbeatAt: null, stalenessMs: Infinity, status: 'lost', electionPending: false, canAuthorStockOps: false }
    }
    const now = Date.now()
    const lastSeen = primary.last_seen ? new Date(primary.last_seen).getTime() : 0
    const stalenessMs = now - lastSeen
    let status: PrimaryDeviceState['status'] = 'online'
    if (stalenessMs > 60_000) status = 'lost'
    else if (stalenessMs > 15_000) status = 'stale'
    const canAuthorStockOps = status === 'online'
    return { primaryId: primary.id, electedAt: null, lastHeartbeatAt: primary.last_seen, stalenessMs, status, electionPending: false, canAuthorStockOps }
  })

  // Transfer primary (host) role to another device
  ipcMain.handle('db:devices:transferPrimary', (_event, toDeviceId: string, shopId: string) => {
    const db = getDatabase()
    const target = db.prepare('SELECT id, device_name FROM devices WHERE id = ? AND shop_id = ?').get(toDeviceId, shopId)
    if (!target) throw new Error('Target device not found')
    const now = new Date().toISOString()
    db.prepare('UPDATE devices SET is_host = 0 WHERE shop_id = ?').run(shopId)
    db.prepare('UPDATE devices SET is_host = 1, last_seen = ? WHERE id = ?').run(now, toDeviceId)
    log.info(`Primary transferred to device ${toDeviceId} for shop ${shopId}`)
    return { success: true, primaryDeviceId: toDeviceId }
  })

  // Get primary status (alias for getPrimaryState for naming consistency)
  ipcMain.handle('db:devices:getPrimaryStatus', (_event, shopId: string) => {
    const db = getDatabase()
    const primary = db.prepare(
      'SELECT id, device_name, last_seen FROM devices WHERE is_host = 1 AND shop_id = ? LIMIT 1',
    ).get(shopId) as { id: string; device_name: string; last_seen: string | null } | undefined
    if (!primary) {
      return { primaryId: null, primaryName: null, electedAt: null, lastHeartbeatAt: null, stalenessMs: Infinity, status: 'lost', electionPending: false }
    }
    const now = Date.now()
    const lastSeen = primary.last_seen ? new Date(primary.last_seen).getTime() : 0
    const stalenessMs = now - lastSeen
    let status: 'online' | 'stale' | 'lost' = 'online'
    if (stalenessMs > 60_000) status = 'lost'
    else if (stalenessMs > 15_000) status = 'stale'
    return { primaryId: primary.id, primaryName: primary.device_name, electedAt: null, lastHeartbeatAt: primary.last_seen, stalenessMs, status, electionPending: false }
  })

  log.info('Device IPC handlers registered')
}
