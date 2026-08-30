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
}
