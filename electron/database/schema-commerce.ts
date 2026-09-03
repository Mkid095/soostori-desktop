import { getDatabase } from './index'

export function createCommerceTables(): void {
  const database = getDatabase()

  database.exec(`
    CREATE TABLE IF NOT EXISTS offer_combos (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT DEFAULT 'combo',
      discount_type TEXT, discount_value REAL, applicable_products TEXT NOT NULL,
      is_active INTEGER DEFAULT 1, barcode TEXT UNIQUE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT, email TEXT,
      address TEXT, notes TEXT, is_active INTEGER DEFAULT 1,
      id_number TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS debts (
      id TEXT PRIMARY KEY, customer_id TEXT, sale_id TEXT,
      amount REAL NOT NULL, amount_paid REAL DEFAULT 0,
      status TEXT DEFAULT 'pending', due_date TEXT, notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (sale_id) REFERENCES sales(id)
    )
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS debt_payments (
      id TEXT PRIMARY KEY, debt_id TEXT NOT NULL,
      amount REAL NOT NULL, payment_method TEXT DEFAULT 'cash',
      reference TEXT, notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (debt_id) REFERENCES debts(id)
    )
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY, amount REAL NOT NULL,
      category TEXT NOT NULL DEFAULT 'other', note TEXT DEFAULT '',
      date TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS shops (
      id TEXT PRIMARY KEY, name TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'KES', owner_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY, shop_id TEXT NOT NULL, name TEXT NOT NULL,
      pin_hash TEXT NOT NULL DEFAULT '', pin_salt TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'cashier', is_active INTEGER NOT NULL DEFAULT 1,
      cloud_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (shop_id) REFERENCES shops(id)
    )
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS invitations (
      id TEXT PRIMARY KEY, shop_id TEXT NOT NULL, employee_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'cashier', code TEXT NOT NULL UNIQUE,
      device_name TEXT, created_by TEXT NOT NULL,
      expires_at TEXT NOT NULL, used_at TEXT,
      FOREIGN KEY (shop_id) REFERENCES shops(id)
    )
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY, shop_id TEXT NOT NULL, employee_id TEXT,
      device_name TEXT NOT NULL DEFAULT 'POS',
      device_type TEXT NOT NULL DEFAULT 'desktop',
      capabilities TEXT NOT NULL DEFAULT '{"sales":true,"inventory":true,"printing":true}',
      is_host INTEGER NOT NULL DEFAULT 0, is_online INTEGER NOT NULL DEFAULT 0,
      connection_token TEXT,
      last_seen TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (shop_id) REFERENCES shops(id)
    )
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY, shop_id TEXT NOT NULL, user_id TEXT NOT NULL,
      device_id TEXT, action TEXT NOT NULL,
      entity_type TEXT, entity_id TEXT, payload TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  // Device pairing approvals — new LAN devices must be approved by owner/manager
  database.exec(`
    CREATE TABLE IF NOT EXISTS device_pairings (
      id          TEXT PRIMARY KEY,
      shop_id     TEXT NOT NULL,
      device_id   TEXT NOT NULL,
      requested_by TEXT NOT NULL,
      approved_by TEXT,
      status      TEXT NOT NULL DEFAULT 'pending',
      token       TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  // Active login sessions — tracks who is logged into which device
  database.exec(`
    CREATE TABLE IF NOT EXISTS device_sessions (
      id         TEXT PRIMARY KEY,
      device_id  TEXT NOT NULL,
      user_id   TEXT NOT NULL,
      login_at  TEXT NOT NULL,
      logout_at TEXT,
      FOREIGN KEY (device_id) REFERENCES devices(id)
    )
  `)
}
