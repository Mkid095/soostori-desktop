import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'
// Phase 11.2 Batch A: consume the published @soostori/auth and @soostori/core
// directly. desktop-adapter was a transitional bridge only.
import { hashPin, verifyPin } from '@soostori/auth/pin-node'
// Phase 04: replaced old hasPermission (role-level) with canonical can/capability API
import { can, CAPABILITIES } from '@soostori/auth'
import type { Member } from '@soostori/auth'
import { asUserId, asShopId, asEmployeeId, asDeviceId } from '@soostori/core'
import type { AuthSession, EmployeeRole } from '@soostori/core'
import { desktopSaveSession, desktopClearSession, desktopLoadSession } from '../auth/electron-store-session'
import {
  setupPin as opSetupPin, verifyPin as opVerifyPin, hasPinEnrolled as opHasPinEnrolled,
  changePin as opChangePin, clearPin as opClearPin,
  isWithinOfflineEntitlement, isSessionExpired, getOpAuthLockState,
  getEnrollmentState, beginEnrollment, completeEnrollmentWithCloudVerify,
  requestPinRecovery, verifyPinRecoveryCode, resetPinWithRecovery,
  serializeOpSession, deserializeOpSession,
} from '../auth/desktop-operational-auth'
import { loginSchema, createUserSchema, updateUserSchema } from './validation'

interface ShopUserRow {
  id: string; shop_id: string; name: string; pin_hash: string;
  pin_salt: string; role: string; is_active: number; created_at: string;
}

const SESSION_TTL_HOURS = 24

/** Build a Member object for the capability system from the session's employeeId. */
function getCallerMember(session: AuthSession): Member {
  const db = getDatabase()
  const row = db.prepare('SELECT role FROM employees WHERE id = ?').get(session.employeeId as string) as { role: string } | undefined
  return { role: (row?.role ?? 'cashier') as EmployeeRole }
}

export function registerAuthHandlers(): void {
  ipcMain.handle('db:auth:login', async (_event, rawData: unknown) => {
    const data = loginSchema.parse(rawData)
    const db = getDatabase()
    const user = db.prepare('SELECT * FROM employees WHERE id = ? AND is_active = 1').get(data.userId) as ShopUserRow | undefined
    if (!user) throw new Error('User not found or inactive')
    if (!verifyPin(data.pin, user.pin_hash, user.pin_salt)) throw new Error('Invalid PIN')

    const sessionId = uuidv4()
    const now = new Date().toISOString()
    db.prepare(`INSERT INTO device_sessions (id, device_id, user_id, login_at) VALUES (?, ?, ?, ?)`).run(sessionId, data.deviceId, data.userId, now)
    db.prepare('UPDATE devices SET is_online = 1, last_seen = ? WHERE id = ?').run(now, data.deviceId)

    const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000).toISOString()
    const session: AuthSession = {
      userId: asUserId(user.id),
      shopId: asShopId(user.shop_id),
      employeeId: asEmployeeId(user.id),
      deviceId: asDeviceId(data.deviceId),
      email: '',
      createdAt: now,
      expiresAt,
    }
    await desktopSaveSession(session)

    // Step 4: also establish an OperationalAuth session using the SDK.
    // If a local PIN was previously enrolled on this device, verify it via
    // OperationalAuth (returns a 24-hour OperationalSession). If not,
    // enroll one now from the same PIN the user just entered — matches the
    // canonical two-layer auth model (CloudAuth + OperationalAuth).
    let operationalEstablished = false
    try {
      const enrolled = await opHasPinEnrolled()
      if (!enrolled) {
        const setup = await opSetupPin(
          asEmployeeId(user.id),
          asShopId(user.shop_id),
          asDeviceId(data.deviceId),
          data.pin,
        )
        operationalEstablished = setup.ok
      } else {
        const verify = await opVerifyPin(
          asEmployeeId(user.id),
          asShopId(user.shop_id),
          asDeviceId(data.deviceId),
          data.pin,
        )
        operationalEstablished = verify.ok
      }
    } catch (err) {
      log.warn('OperationalAuth setup/verify during login failed (non-fatal):', err)
    }

    return {
      sessionId,
      user: { id: user.id, shop_id: user.shop_id, name: user.name, role: user.role },
      operationalEstablished,
    }
  })

  ipcMain.handle('db:auth:createUser', async (_event, rawData: unknown) => {
    const session = await desktopLoadSession()
    if (!session) throw new Error('Not authenticated')
    if (!can(getCallerMember(session), CAPABILITIES.TEAM_UPDATE)) throw new Error('Insufficient permissions: team.update required')
    const data = createUserSchema.parse(rawData)
    const db = getDatabase()
    const userId = uuidv4()
    const { hash, salt } = hashPin(data.pin)
    db.prepare(`INSERT INTO employees (id, shop_id, name, pin_hash, pin_salt, role, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)`)
      .run(userId, data.shopId, data.name, hash, salt, data.role, new Date().toISOString())
    return db.prepare('SELECT id, shop_id, name, role, is_active, created_at FROM employees WHERE id = ?').get(userId)
  })

  ipcMain.handle('db:auth:updateUser', async (_event, rawData: unknown) => {
    const session = await desktopLoadSession()
    if (!session) throw new Error('Not authenticated')
    if (!can(getCallerMember(session), CAPABILITIES.TEAM_UPDATE)) throw new Error('Insufficient permissions: team.update required')
    const data = updateUserSchema.parse(rawData)
    const db = getDatabase()
    const fields: string[] = []; const values: (string | number | null)[] = []
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
    if (data.role !== undefined) { fields.push('role = ?'); values.push(data.role) }
    if (data.pin) { const { hash, salt } = hashPin(data.pin); fields.push('pin_hash = ?', 'pin_salt = ?'); values.push(hash, salt) }
    if (fields.length === 0) return db.prepare('SELECT * FROM employees WHERE id = ?').get(data.userId)
    values.push(data.userId)
    db.prepare(`UPDATE employees SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return db.prepare('SELECT id, shop_id, name, role, is_active, created_at FROM employees WHERE id = ?').get(data.userId)
  })

  ipcMain.handle('db:auth:deleteUser', async (_event, userId: string) => {
    const session = await desktopLoadSession()
    if (!session) throw new Error('Not authenticated')
    if (!can(getCallerMember(session), CAPABILITIES.TEAM_REMOVE)) throw new Error('Insufficient permissions: team.remove required')
    getDatabase().prepare('UPDATE employees SET is_active = 0 WHERE id = ?').run(userId)
    return { success: true }
  })

  // D5: logout handler now reads from a single object payload sent by preload
  ipcMain.handle('db:auth:logout', async (_event, rawData: unknown) => {
    const { sessionId, deviceId, userId } = rawData as { sessionId: string; deviceId: string; userId: string }
    const db = getDatabase(); const now = new Date().toISOString()
    if (sessionId) db.prepare('UPDATE device_sessions SET logout_at = ? WHERE id = ?').run(now, sessionId)
    if (deviceId) {
      db.prepare('UPDATE device_sessions SET logout_at = ? WHERE device_id = ? AND user_id = ? AND logout_at IS NULL').run(now, deviceId, userId)
      db.prepare('UPDATE devices SET is_online = 0 WHERE id = ?').run(deviceId)
    }
    await desktopClearSession()
    return { success: true }
  })

  // Phase 04: now uses canonical capability API — accepts role string and capability
  ipcMain.handle('db:auth:can', (_event, role: string, capability: string) => {
    if (!(['owner', 'manager', 'cashier', 'attendant', 'viewer'] as const).includes(role as any)) {
      throw new Error('UNKNOWN_ROLE')
    }
    const member: Member = { role: role as EmployeeRole }
    return can(member, capability as any)
  })

  // ── Phase 01: OperationalAuth enrollment + recovery IPC ──────────────────────

  ipcMain.handle('op:getEnrollmentState', async (_e, shopId: string, deviceId: string) => {
    try { return { state: await getEnrollmentState(asShopId(shopId), asDeviceId(deviceId)) } }
    catch (err) { return { state: 'DEVICE_NOT_ENROLLED', error: String(err) } }
  })

  ipcMain.handle('op:beginEnrollment', async (_e, params: {
    state: string; shopId: string; deviceId: string; deviceName: string; employeeId?: string; pinVerificationProof?: string
  }) => {
    try {
      const result = await beginEnrollment({
        state: params.state as import('@soostori/auth').DeviceEnrollmentState,
        shopId: asShopId(params.shopId),
        deviceId: asDeviceId(params.deviceId),
        deviceName: params.deviceName,
        employeeId: params.employeeId as import('@soostori/core').EmployeeId | undefined,
        pinVerificationProof: params.pinVerificationProof,
      })
      return result
    } catch (err) { return { error: String(err) } }
  })

  ipcMain.handle('op:completeEnrollmentWithCloudVerify', async (_e, params: {
    enrollmentToken: string; employeeId: string; shopId: string; deviceId: string; newPin: string
  }) => {
    try {
      await completeEnrollmentWithCloudVerify({
        enrollmentToken: params.enrollmentToken,
        employeeId: asEmployeeId(params.employeeId),
        shopId: asShopId(params.shopId),
        deviceId: asDeviceId(params.deviceId),
        newPin: params.newPin,
      })
      return { success: true }
    } catch (err) { return { success: false, error: String(err) } }
  })

  ipcMain.handle('op:changePin', async (_e, params: {
    employeeId: string; shopId: string; deviceId: string; oldPin: string; newPin: string
  }) => {
    try {
      const result = await opChangePin(asEmployeeId(params.employeeId), asShopId(params.shopId), asDeviceId(params.deviceId), params.oldPin, params.newPin)
      return result
    } catch (err) { return { ok: false, error: String(err) } }
  })

  ipcMain.handle('op:clearPin', async () => {
    try { await opClearPin(); return { success: true } }
    catch (err) { return { success: false, error: String(err) } }
  })

  ipcMain.handle('op:getLockState', () => getOpAuthLockState())

  ipcMain.handle('op:isWithinOfflineEntitlement', (_e, session: unknown) => {
    return isWithinOfflineEntitlement(session as Parameters<typeof isWithinOfflineEntitlement>[0])
  })

  ipcMain.handle('op:isSessionExpired', (_e, session: unknown) => {
    return isSessionExpired(session as Parameters<typeof isSessionExpired>[0])
  })

  ipcMain.handle('op:serializeSession', (_e, session: unknown) => {
    return serializeOpSession(session as Parameters<typeof serializeOpSession>[0])
  })

  ipcMain.handle('op:deserializeSession', (_e, raw: string) => {
    return deserializeOpSession(raw)
  })

  // ── PIN Recovery ─────────────────────────────────────────────────────────────

  ipcMain.handle('op:requestPinRecovery', async (_e, employeeId: string) => {
    try { return { cooldownSeconds: (await requestPinRecovery(asEmployeeId(employeeId))).cooldownSeconds } }
    catch (err) { return { error: String(err) } }
  })

  ipcMain.handle('op:verifyPinRecoveryCode', async (_e, employeeId: string, code: string) => {
    try { return await verifyPinRecoveryCode(asEmployeeId(employeeId), code) }
    catch (err) { return { error: String(err) } }
  })

  ipcMain.handle('op:resetPinWithRecovery', async (_e, params: {
    recoveryAuthToken: string; employeeId: string; newPin: string; shopId: string; deviceId: string
  }) => {
    try {
      await resetPinWithRecovery({
        recoveryAuthToken: params.recoveryAuthToken,
        employeeId: asEmployeeId(params.employeeId),
        newPin: params.newPin,
        shopId: asShopId(params.shopId),
        deviceId: asDeviceId(params.deviceId),
      })
      return { success: true }
    } catch (err) { return { success: false, error: String(err) } }
  })

  log.info('Auth IPC handlers registered')
}
