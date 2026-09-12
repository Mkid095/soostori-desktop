/**
 * settings-service.ts — Phase 19: Business logic layer for settings mutations.
 *
 * Validates and persists settings changes to SQLite.
 * Called by IPC handlers; never called directly from renderer.
 */

import { getDatabase } from '../database'
import { resolveActiveShopId } from '../database/active-shop'
import { desktopLoadSession } from '../auth/electron-store-session'
import { hashPin } from '@soostori/auth/pin-node'
import { audit } from './audit-logger'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BusinessProfileUpdate {
  name?: string
  address?: string
  phone?: string
  email?: string
  currency?: string
  receiptFooter?: string
  receiptPrefix?: string
  lowStockThreshold?: number
}

export interface OwnerProfileUpdate {
  name?: string
  email?: string
  phone?: string
}

export interface MpesaConfigUpdate {
  mpesaSendMoneyPhone?: string
  mpesaPaybillNumber?: string
  mpesaPaybillAccount?: string
  bankPaybillNumber?: string
  bankPaybillAccount?: string
  mpesaPochiPhone?: string
}

// ── Business Profile ────────────────────────────────────────────────────────────

export async function updateBusinessProfile(
  data: BusinessProfileUpdate
): Promise<Record<string, unknown>> {
  const session = await desktopLoadSession()
  const employeeId = session?.employeeId ?? 'unknown'
  const db = getDatabase()
  const shopId = await resolveActiveShopId()
  const now = new Date().toISOString()

  const fields: string[] = []
  const values: (string | number | null)[] = []

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
  if (data.address !== undefined) { fields.push('address = ?'); values.push(data.address || null) }
  if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone || null) }
  if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email || null) }
  if (data.currency !== undefined) { fields.push('currency = ?'); values.push(data.currency) }
  if (data.receiptFooter !== undefined) { fields.push('receipt_footer = ?'); values.push(data.receiptFooter || null) }
  if (data.receiptPrefix !== undefined) { fields.push('receipt_prefix = ?'); values.push(data.receiptPrefix || null) }
  if (data.lowStockThreshold !== undefined) {
    fields.push('low_stock_threshold = ?')
    values.push(data.lowStockThreshold ?? 5)
  }

  if (fields.length === 0) {
    return db.prepare('SELECT * FROM shop_settings WHERE id = ?').get(shopId) as Record<string, unknown>
  }

  fields.push('updated_at = ?')
  values.push(now)
  values.push(shopId)

  db.prepare(`UPDATE shop_settings SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  audit.shopSettingsUpdated(shopId, employeeId, { updatedFields: fields })

  return db.prepare('SELECT * FROM shop_settings WHERE id = ?').get(shopId) as Record<string, unknown>
}

// ── Owner Profile ──────────────────────────────────────────────────────────────

export async function updateOwnerProfile(
  data: OwnerProfileUpdate
): Promise<Record<string, unknown>> {
  const session = await desktopLoadSession()
  if (!session?.employeeId) throw new Error('No active session')
  const db = getDatabase()
  const now = new Date().toISOString()

  const fields: string[] = []
  const values: (string | null)[] = []

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name || null) }
  if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email || null) }
  if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone || null) }

  if (fields.length === 0) {
    return db.prepare('SELECT * FROM employees WHERE id = ?').get(session.employeeId) as Record<string, unknown>
  }

  fields.push('updated_at = ?')
  values.push(now)
  values.push(session.employeeId)

  db.prepare(`UPDATE employees SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  audit.employeeProfileUpdated(session.employeeId, { updatedFields: fields })

  return db.prepare('SELECT * FROM employees WHERE id = ?').get(session.employeeId) as Record<string, unknown>
}

// ── M-Pesa Config ─────────────────────────────────────────────────────────────

export async function updateMpesaConfig(
  data: MpesaConfigUpdate
): Promise<Record<string, unknown>> {
  const session = await desktopLoadSession()
  const employeeId = session?.employeeId ?? 'unknown'
  const db = getDatabase()
  const shopId = await resolveActiveShopId()
  const now = new Date().toISOString()

  const fields: string[] = []
  const values: (string | number | null)[] = []

  if (data.mpesaSendMoneyPhone !== undefined) { fields.push('mpesa_send_money_phone = ?'); values.push(data.mpesaSendMoneyPhone || null) }
  if (data.mpesaPaybillNumber !== undefined) { fields.push('mpesa_paybill_number = ?'); values.push(data.mpesaPaybillNumber || null) }
  if (data.mpesaPaybillAccount !== undefined) { fields.push('mpesa_paybill_account = ?'); values.push(data.mpesaPaybillAccount || null) }
  if (data.bankPaybillNumber !== undefined) { fields.push('bank_paybill_number = ?'); values.push(data.bankPaybillNumber || null) }
  if (data.bankPaybillAccount !== undefined) { fields.push('bank_paybill_account = ?'); values.push(data.bankPaybillAccount || null) }
  if (data.mpesaPochiPhone !== undefined) { fields.push('mpesa_pochi_phone = ?'); values.push(data.mpesaPochiPhone || null) }

  if (fields.length === 0) {
    return db.prepare('SELECT * FROM shop_settings WHERE id = ?').get(shopId) as Record<string, unknown>
  }

  fields.push('updated_at = ?')
  values.push(now)
  values.push(shopId)

  db.prepare(`UPDATE shop_settings SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  audit.mpesaConfigUpdated(shopId, employeeId, { updatedFields: fields })

  return db.prepare('SELECT * FROM shop_settings WHERE id = ?').get(shopId) as Record<string, unknown>
}

// ── PIN Update ────────────────────────────────────────────────────────────────

export async function updatePin(
  employeeId: string,
  newPin: string
): Promise<{ success: boolean }> {
  const db = getDatabase()
  const { hash, salt } = hashPin(newPin)
  const now = new Date().toISOString()
  db.prepare(`
    UPDATE employees SET pin_hash = ?, pin_salt = ?, updated_at = ? WHERE id = ?
  `).run(hash, salt, now, employeeId)
  return { success: true }
}
