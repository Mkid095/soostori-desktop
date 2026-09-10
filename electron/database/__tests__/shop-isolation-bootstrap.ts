/**
 * shop-isolation-bootstrap.ts — Shared in-memory schema + harness for
 * shop-isolation integration tests. Mirrors the production CREATE TABLE
 * definitions of the eight commercial tables, then exposes a fresh
 * per-test database via createTestDb().
 *
 * Run with the tests in shop-isolation-*.test.ts.
 */

import Database from 'better-sqlite3'

export function bootstrapIsolationSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS shops (
      id TEXT PRIMARY KEY, name TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'KES', owner_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, icon TEXT,
      color TEXT DEFAULT '#6366f1', display_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      shop_id TEXT NOT NULL DEFAULT 'default',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY, category_id TEXT, name TEXT NOT NULL,
      sku TEXT, barcode TEXT UNIQUE, description TEXT, image_url TEXT,
      cost_price REAL DEFAULT 0, selling_price REAL NOT NULL,
      discount_price REAL, unit TEXT DEFAULT 'piece',
      stock_quantity INTEGER DEFAULT 0, current_stock INTEGER DEFAULT 0, low_stock_threshold INTEGER DEFAULT 5,
      track_inventory INTEGER DEFAULT 1, has_variants INTEGER DEFAULT 0,
      parent_variant_id TEXT, expiry_date TEXT, metadata TEXT,
      is_active INTEGER DEFAULT 1, deleted_at TEXT,
      distributor_name TEXT, distributor_phone TEXT,
      shop_id TEXT NOT NULL DEFAULT 'default',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT, email TEXT,
      address TEXT, notes TEXT, is_active INTEGER DEFAULT 1,
      id_number TEXT,
      shop_id TEXT NOT NULL DEFAULT 'default',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY, type TEXT DEFAULT 'retail',
      status TEXT DEFAULT 'completed', subtotal REAL NOT NULL,
      discount_amount REAL DEFAULT 0, tax_amount REAL DEFAULT 0,
      total_amount REAL NOT NULL, paid_amount REAL NOT NULL,
      payment_method TEXT DEFAULT 'cash', note TEXT,
      customer_id_number TEXT,
      shop_id TEXT NOT NULL DEFAULT 'default',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY, sale_id TEXT NOT NULL, product_id TEXT,
      variation_name TEXT, product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL, unit_price REAL NOT NULL,
      discount REAL DEFAULT 0, total_price REAL NOT NULL,
      shop_id TEXT NOT NULL DEFAULT 'default',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS debts (
      id TEXT PRIMARY KEY, customer_id TEXT, sale_id TEXT,
      amount REAL NOT NULL, amount_paid REAL DEFAULT 0,
      status TEXT DEFAULT 'pending', due_date TEXT, notes TEXT,
      shop_id TEXT NOT NULL DEFAULT 'default',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY, amount REAL NOT NULL,
      category TEXT NOT NULL DEFAULT 'other', note TEXT DEFAULT '',
      date TEXT NOT NULL,
      shop_id TEXT NOT NULL DEFAULT 'default',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS held_sales (
      id TEXT PRIMARY KEY, name TEXT, cart_items TEXT NOT NULL,
      payment_method TEXT DEFAULT 'cash',
      shop_id TEXT NOT NULL DEFAULT 'default',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `)
}

/** Fresh in-memory DB with both shops seeded. Caller must db.close() when done. */
export function createTestDb(): Database.Database {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  bootstrapIsolationSchema(db)
  db.prepare(`INSERT INTO shops (id, name) VALUES (?, ?)`).run('shopA', 'Acme Coffee')
  db.prepare(`INSERT INTO shops (id, name) VALUES (?, ?)`).run('shopB', 'Beverage Bazaar')
  return db
}
