import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import log from 'electron-log'
import { shopSettingsSchema } from './validation'

export function registerSettingsHandlers(): void {
  ipcMain.handle('db:shop-settings:get', () => {
    const db = getDatabase()
    return db.prepare('SELECT * FROM shop_settings WHERE id = ?').get('default')
  })

  ipcMain.handle('db:shop-settings:update', (_event, rawSettings: unknown) => {
    const settings = shopSettingsSchema.parse(rawSettings)
    const db = getDatabase()
    const now = new Date().toISOString()

    const fields: string[] = []
    const values: (string | number | null)[] = []

    if (settings.name !== undefined) { fields.push('name = ?'); values.push(settings.name) }
    if (settings.address !== undefined) { fields.push('address = ?'); values.push(settings.address || null) }
    if (settings.phone !== undefined) { fields.push('phone = ?'); values.push(settings.phone || null) }
    if (settings.email !== undefined) { fields.push('email = ?'); values.push(settings.email || null) }
    if (settings.currency !== undefined) { fields.push('currency = ?'); values.push(settings.currency) }
    if (settings.receiptFooter !== undefined) { fields.push('receipt_footer = ?'); values.push(settings.receiptFooter || null) }
    if (settings.lowStockThreshold !== undefined) { fields.push('low_stock_threshold = ?'); values.push(settings.lowStockThreshold ?? 5) }
    if (settings.receiptPrefix !== undefined) { fields.push('receipt_prefix = ?'); values.push(settings.receiptPrefix || null) }
    if (settings.mpesaSendMoneyPhone !== undefined) { fields.push('mpesa_send_money_phone = ?'); values.push(settings.mpesaSendMoneyPhone || null) }
    if (settings.mpesaPaybillNumber !== undefined) { fields.push('mpesa_paybill_number = ?'); values.push(settings.mpesaPaybillNumber || null) }
    if (settings.mpesaPaybillAccount !== undefined) { fields.push('mpesa_paybill_account = ?'); values.push(settings.mpesaPaybillAccount || null) }
    if (settings.bankPaybillNumber !== undefined) { fields.push('bank_paybill_number = ?'); values.push(settings.bankPaybillNumber || null) }
    if (settings.bankPaybillAccount !== undefined) { fields.push('bank_paybill_account = ?'); values.push(settings.bankPaybillAccount || null) }
    if (settings.mpesaPochiPhone !== undefined) { fields.push('mpesa_pochi_phone = ?'); values.push(settings.mpesaPochiPhone || null) }

    fields.push('updated_at = ?')
    values.push(now)
    values.push('default')

    db.prepare(`UPDATE shop_settings SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return db.prepare('SELECT * FROM shop_settings WHERE id = ?').get('default')
  })

  // App settings IPC handlers
  ipcMain.handle('app:settings:getDefaults', () => {
    const db = getDatabase()
    const row = db.prepare('SELECT default_theme, default_language, login_pin, pin_set, last_login FROM app_settings WHERE id = ?').get('default') as {
      default_theme: string; default_language: string; login_pin: string; pin_set: number; last_login: string | null
    } | undefined
    if (!row) return { defaultTheme: 'light', defaultLanguage: 'en', pinSet: 0, lastLogin: null }
    return {
      defaultTheme: row.default_theme as 'light' | 'dark',
      defaultLanguage: row.default_language as 'en' | 'sw',
      pinSet: row.pin_set,
      lastLogin: row.last_login,
    }
  })

  ipcMain.handle('app:settings:setDefaultTheme', (_event, theme: 'light' | 'dark') => {
    const db = getDatabase()
    db.prepare('UPDATE app_settings SET default_theme = ?, updated_at = ? WHERE id = ?').run(theme, new Date().toISOString(), 'default')
    return db.prepare('SELECT default_theme FROM app_settings WHERE id = ?').get('default')
  })

  ipcMain.handle('app:settings:setDefaultLanguage', (_event, language: 'en' | 'sw') => {
    const db = getDatabase()
    db.prepare('UPDATE app_settings SET default_language = ?, updated_at = ? WHERE id = ?').run(language, new Date().toISOString(), 'default')
    return db.prepare('SELECT default_language FROM app_settings WHERE id = ?').get('default')
  })

  ipcMain.handle('app:settings:setPin', (_event, pin: string) => {
    const db = getDatabase()
    db.prepare('UPDATE app_settings SET login_pin = ?, pin_set = 1, updated_at = ? WHERE id = ?').run(pin, new Date().toISOString(), 'default')
    return { success: true }
  })

  ipcMain.handle('app:settings:verifyPin', (_event, pin: string) => {
    const db = getDatabase()
    const row = db.prepare('SELECT login_pin FROM app_settings WHERE id = ?').get('default') as { login_pin: string } | undefined
    return { valid: row?.login_pin === pin }
  })

  ipcMain.handle('app:settings:recordLogin', () => {
    const db = getDatabase()
    db.prepare('UPDATE app_settings SET last_login = ?, updated_at = ? WHERE id = ?').run(new Date().toISOString(), new Date().toISOString(), 'default')
  })

  log.info('Settings IPC handlers registered')
}
