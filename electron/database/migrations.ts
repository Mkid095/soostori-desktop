import { getDatabase } from './index'
import log from 'electron-log'

const CURRENT_VERSION = 3

export function runMigrations(): void {
  const db = getDatabase()

  // Ensure migrations table exists
  // NOTE: DEFAULT (datetime('now')) works in CREATE TABLE but NOT in ALTER TABLE ADD COLUMN.
  // Use explicit timestamps in INSERT instead.
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `)

  const row = db.prepare('SELECT MAX(version) as version FROM schema_migrations').get() as { version: number | null } | undefined
  const appliedVersion = row?.version ?? 0

  if (appliedVersion >= CURRENT_VERSION) {
    log.info(`Schema migrations: already at version ${appliedVersion}`)
    return
  }

  log.info(`Schema migrations: applying ${appliedVersion} → ${CURRENT_VERSION}`)

  // v1: add current_stock to products if missing
  if (appliedVersion < 1) {
    db.prepare(`INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?, datetime('now'))`).run(1)
    const cols = (db.prepare("PRAGMA table_info(products)").all() as { name: string }[])
    if (!cols.find(c => c.name === 'current_stock')) {
      db.exec('ALTER TABLE products ADD COLUMN current_stock INTEGER DEFAULT 0')
      // Initialize from stock_quantity so existing products have correct balance
      db.exec('UPDATE products SET current_stock = stock_quantity WHERE current_stock = 0 AND stock_quantity > 0')
      log.info('[Migration v1] current_stock added to products, initialized from stock_quantity')
    } else {
      log.info('[Migration v1] current_stock already present')
    }
  }

  // v2: add idempotency_key to inventory_transactions
  if (appliedVersion < 2) {
    db.prepare(`INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?, datetime('now'))`).run(2)
    const cols = (db.prepare("PRAGMA table_info(inventory_transactions)").all() as { name: string }[])
    if (!cols.find(c => c.name === 'idempotency_key')) {
      db.exec('ALTER TABLE inventory_transactions ADD COLUMN idempotency_key TEXT')
      db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_inv_tx_idemokey ON inventory_transactions(idempotency_key) WHERE idempotency_key IS NOT NULL')
      log.info('[Migration v2] idempotency_key + index added to inventory_transactions')
    } else {
      log.info('[Migration v2] idempotency_key already present')
    }
  }

  // v3: add device_id to devices + login_pin_hash/login_pin_salt to app_settings
  if (appliedVersion < 3) {
    db.prepare(`INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?, datetime('now'))`).run(3)
    const deviceCols = (db.prepare("PRAGMA table_info(devices)").all() as { name: string }[])
    if (!deviceCols.find(c => c.name === 'device_id')) {
      db.exec('ALTER TABLE devices ADD COLUMN device_id TEXT')
      log.info('[Migration v3] device_id added to devices')
    }
    const appCols = (db.prepare("PRAGMA table_info(app_settings)").all() as { name: string }[])
    if (!appCols.find(c => c.name === 'login_pin_hash')) {
      db.exec('ALTER TABLE app_settings ADD COLUMN login_pin_hash TEXT')
      db.exec('ALTER TABLE app_settings ADD COLUMN login_pin_salt TEXT')
      log.info('[Migration v3] login_pin_hash + login_pin_salt added to app_settings')
    }
  }

  log.info(`Schema migrations complete: now at version ${CURRENT_VERSION}`)
}
