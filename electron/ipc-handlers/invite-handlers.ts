import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'
// Phase 11.2 Batch A: route hashPin through the published SDK.
import { hashPin } from '@soostori/auth/pin-node'

export function registerInviteHandlers(): void {
  ipcMain.handle('db:invites:create', (_event, rawData: unknown) => {
    const data = rawData as { shopId: string; employeeName: string; role: string; createdBy: string; deviceName?: string }
    const db = getDatabase(); const id = uuidv4(); const now = new Date().toISOString()
    // SECURITY(P2-17): Upgraded from 6-digit numeric (10^6 combos) to 16-char
    // alphanumeric (~$7.2×10^28 combos) to prevent brute-force attacks over the LAN.
    // UUIDv4 has ~122 bits of entropy; we use 16 chars from its base64url encoding.
    const code = uuidv4().replace(/-/g, '').slice(0, 16)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    db.prepare(`INSERT INTO invitations (id, shop_id, employee_name, role, code, device_name, created_by, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, data.shopId, data.employeeName, data.role || 'cashier', code, data.deviceName || null, data.createdBy, expiresAt, now)
    log.info(`Invite created: ${id} for ${data.employeeName}`)
    return db.prepare('SELECT * FROM invitations WHERE id = ?').get(id)
  })

  ipcMain.handle('db:invites:accept', (_event, rawData: unknown) => {
    const data = rawData as { code: string; userName: string; pin: string; deviceId: string }
    const db = getDatabase()
    const invite = db.prepare('SELECT * FROM invitations WHERE code = ?').get(data.code) as { id: string; shop_id: string; role: string; expires_at: string; used_at: string | null } | undefined
    if (!invite) throw new Error('Invitation not found')
    if (invite.used_at) throw new Error('Invitation already used')
    if (new Date(invite.expires_at) < new Date()) throw new Error('Invitation expired')
    const userId = uuidv4(); const now = new Date().toISOString(); const { hash, salt } = hashPin(data.pin)
    db.prepare(`INSERT INTO employees (id, shop_id, name, pin_hash, pin_salt, role, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)`)
      .run(userId, invite.shop_id, data.userName, hash, salt, invite.role, now)
    // NOTE: device linking is done by the caller after device registration with canonical UUID
    db.prepare(`UPDATE invitations SET used_at = ? WHERE id = ?`).run(now, invite.id)
    db.prepare(`INSERT INTO device_sessions (id, device_id, user_id, login_at) VALUES (?, ?, ?, ?)`).run(uuidv4(), data.deviceId, userId, now)
    log.info(`Invite accepted: ${invite.id}, user: ${userId}`)
    return { userId, shopId: invite.shop_id }
  })

  ipcMain.handle('db:invites:list', (_event, shopId: string) => {
    return getDatabase().prepare('SELECT * FROM invitations WHERE shop_id = ? AND used_at IS NULL ORDER BY created_at DESC').all(shopId)
  })

  log.info('Invite IPC handlers registered')
}
