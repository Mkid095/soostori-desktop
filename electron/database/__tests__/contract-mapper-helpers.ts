/**
 * contract-mapper-helpers.ts — Shared in-memory DB fixture for the
 * `contract-mapper.test.ts` suite. Mirrors the production schema for all 13
 * entities the mapper covers, seeded with two distinct shops so the round-trip
 * tests can also assert shop_id isolation at the mapper boundary.
 *
 * Run with the tests in `contract-mapper.test.ts`.
 *
 * ANPAS: ≤150 lines, no helpers.ts / common.ts / utils.ts (this is a test
 * fixture, named by its purpose: contract-mapper-helpers.ts).
 */

import Database from 'better-sqlite3'

export function bootstrapContractMapperSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE shops (id TEXT PRIMARY KEY, name TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'KES', owner_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')));

    CREATE TABLE categories (id TEXT PRIMARY KEY, name TEXT NOT NULL,
      color TEXT DEFAULT '#6366f1', description TEXT, is_active INTEGER DEFAULT 1,
      shop_id TEXT NOT NULL DEFAULT 'default',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP);

    CREATE TABLE products (id TEXT PRIMARY KEY, name TEXT NOT NULL,
      sku TEXT, barcode TEXT, category_id TEXT, description TEXT,
      cost_price REAL DEFAULT 0, selling_price REAL NOT NULL,
      group_prices TEXT, stock_quantity INTEGER DEFAULT 0,
      current_stock INTEGER DEFAULT 0, low_stock_threshold INTEGER DEFAULT 5,
      track_inventory INTEGER DEFAULT 1, allow_single_unit_sale INTEGER DEFAULT 1,
      distributor_name TEXT, distributor_phone TEXT, image_url TEXT,
      is_active INTEGER DEFAULT 1, units_per_package INTEGER,
      shop_id TEXT NOT NULL DEFAULT 'default',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP);

    CREATE TABLE customers (id TEXT PRIMARY KEY, name TEXT NOT NULL,
      phone TEXT, email TEXT, id_number TEXT, address TEXT, notes TEXT,
      is_active INTEGER DEFAULT 1, shop_id TEXT NOT NULL DEFAULT 'default',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP);

    CREATE TABLE sales (id TEXT PRIMARY KEY, type TEXT DEFAULT 'retail',
      status TEXT DEFAULT 'completed', subtotal REAL NOT NULL,
      discount_amount REAL DEFAULT 0, tax_amount REAL DEFAULT 0,
      total_amount REAL NOT NULL, paid_amount REAL NOT NULL,
      payment_method TEXT DEFAULT 'cash', note TEXT,
      shop_id TEXT NOT NULL DEFAULT 'default',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP);

    CREATE TABLE sale_items (id TEXT PRIMARY KEY, sale_id TEXT NOT NULL,
      product_id TEXT, product_name TEXT NOT NULL, variation_name TEXT,
      quantity INTEGER NOT NULL, unit_price REAL NOT NULL,
      discount REAL DEFAULT 0, total_price REAL NOT NULL,
      shop_id TEXT NOT NULL DEFAULT 'default',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP);

    CREATE TABLE debts (id TEXT PRIMARY KEY, customer_id TEXT, sale_id TEXT,
      amount REAL NOT NULL, amount_paid REAL DEFAULT 0,
      status TEXT DEFAULT 'pending', due_date TEXT, notes TEXT,
      shop_id TEXT NOT NULL DEFAULT 'default',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP);

    CREATE TABLE debt_payments (id TEXT PRIMARY KEY, debt_id TEXT NOT NULL,
      amount REAL NOT NULL, payment_method TEXT DEFAULT 'cash',
      reference TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);

    CREATE TABLE expenses (id TEXT PRIMARY KEY, amount REAL NOT NULL,
      category TEXT NOT NULL DEFAULT 'other', note TEXT DEFAULT '',
      date TEXT NOT NULL, shop_id TEXT NOT NULL DEFAULT 'default',
      created_at TEXT NOT NULL DEFAULT (datetime('now')));

    CREATE TABLE inventory_transactions (id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL, product_id TEXT NOT NULL,
      device_id TEXT NOT NULL, user_id TEXT NOT NULL,
      event_type TEXT NOT NULL, quantity INTEGER NOT NULL,
      balance_after INTEGER NOT NULL DEFAULT 0,
      idempotency_key TEXT, timestamp TEXT,
      payload TEXT, sequence_number INTEGER DEFAULT 0,
      version INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')));

    CREATE TABLE employees (id TEXT PRIMARY KEY, shop_id TEXT NOT NULL,
      name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'cashier',
      is_active INTEGER NOT NULL DEFAULT 1, cloud_id TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')));

    CREATE TABLE devices (id TEXT PRIMARY KEY, shop_id TEXT NOT NULL,
      device_name TEXT NOT NULL DEFAULT 'POS',
      device_type TEXT NOT NULL DEFAULT 'desktop',
      is_host INTEGER NOT NULL DEFAULT 0,
      cloud_has_pin INTEGER NOT NULL DEFAULT 0,
      cloud_pin_setup_at TEXT, last_seen TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')));

    CREATE TABLE invitations (id TEXT PRIMARY KEY, shop_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'cashier', code TEXT NOT NULL UNIQUE,
      created_by TEXT, expires_at TEXT NOT NULL,
      used_at TEXT, cloud_used_at TEXT);
  `)
}

/** Fresh in-memory DB seeded with two shops. Caller must db.close() when done. */
export function createMapperTestDb(): Database.Database {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  bootstrapContractMapperSchema(db)
  db.prepare(`INSERT INTO shops (id, name) VALUES (?, ?)`).run('shopA', 'Acme')
  db.prepare(`INSERT INTO shops (id, name) VALUES (?, ?)`).run('shopB', 'Bazaar')
  return db
}