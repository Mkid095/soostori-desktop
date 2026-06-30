import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'
import log from 'electron-log'

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return db
}

export async function initDatabase(): Promise<void> {
  const userDataPath = app.getPath('userData')
  const dbPath = path.join(userDataPath, 'soostori.db')
  log.info(`Database path: ${dbPath}`)

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  createTables()
  seedDefaultData()
}

function createTables(): void {
  const database = getDatabase()

  // Shop Settings
  database.exec(`
    CREATE TABLE IF NOT EXISTS shop_settings (
      id TEXT PRIMARY KEY DEFAULT 'default',
      name TEXT NOT NULL DEFAULT 'My Shop',
      address TEXT,
      phone TEXT,
      email TEXT,
      currency TEXT DEFAULT 'KES',
      receipt_footer TEXT,
      receipt_prefix TEXT DEFAULT 'INV',
      low_stock_threshold INTEGER DEFAULT 5,
      mpesa_send_money_phone TEXT,
      mpesa_paybill_number TEXT,
      mpesa_paybill_account TEXT,
      bank_paybill_number TEXT,
      bank_paybill_account TEXT,
      mpesa_pochi_phone TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // Categories
  database.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      color TEXT DEFAULT '#6366f1',
      display_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // Products (expanded schema for soostori web app parity)
  database.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      category_id TEXT,
      name TEXT NOT NULL,
      sku TEXT,
      barcode TEXT UNIQUE,
      description TEXT,
      image_url TEXT,
      cost_price REAL DEFAULT 0,
      selling_price REAL NOT NULL,
      discount_price REAL,
      unit TEXT DEFAULT 'piece',
      stock_quantity INTEGER DEFAULT 0,
      low_stock_threshold INTEGER DEFAULT 5,
      track_inventory INTEGER DEFAULT 1,
      has_variants INTEGER DEFAULT 0,
      parent_variant_id TEXT,
      expiry_date TEXT,
      metadata TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      distributor_name TEXT,
      distributor_phone TEXT,
      barcode_generated INTEGER DEFAULT 0,
      allow_single_unit_sale INTEGER DEFAULT 1,
      units_per_package INTEGER,
      box_buying_price REAL,
      bulk_selling_price REAL,
      group_prices TEXT,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );
  `)

  // Migrate existing products table to add new columns (if they don't exist in old db)
  const existingProductCols = database.prepare("PRAGMA table_info(products)").all() as { name: string }[]
  const existingColNames = existingProductCols.map(c => c.name)
  const newCols = [
    { name: 'distributor_name', sql: 'ADD COLUMN distributor_name TEXT' },
    { name: 'distributor_phone', sql: 'ADD COLUMN distributor_phone TEXT' },
    { name: 'barcode_generated', sql: 'ADD COLUMN barcode_generated INTEGER DEFAULT 0' },
    { name: 'allow_single_unit_sale', sql: 'ADD COLUMN allow_single_unit_sale INTEGER DEFAULT 1' },
    { name: 'units_per_package', sql: 'ADD COLUMN units_per_package INTEGER' },
    { name: 'box_buying_price', sql: 'ADD COLUMN box_buying_price REAL' },
    { name: 'bulk_selling_price', sql: 'ADD COLUMN bulk_selling_price REAL' },
    { name: 'group_prices', sql: 'ADD COLUMN group_prices TEXT' },
  ]
  for (const col of newCols) {
    if (!existingColNames.includes(col.name)) {
      try { database.exec(`ALTER TABLE products ${col.sql}`) } catch { /* ignore */ }
    }
  }

  // Product Variants
  database.exec(`
    CREATE TABLE IF NOT EXISTS product_variants (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      name TEXT NOT NULL,
      sku TEXT,
      barcode TEXT UNIQUE,
      cost_price REAL,
      selling_price REAL,
      stock_quantity INTEGER DEFAULT 0,
      metadata TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
  `)

  // Stock Movements (audit trail)
  database.exec(`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      reason TEXT,
      reference_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
  `)

  // Stock Adjustment Log
  database.exec(`
    CREATE TABLE IF NOT EXISTS stock_adjustment_log (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      user_id TEXT,
      quantity_before INTEGER NOT NULL,
      quantity_after INTEGER NOT NULL,
      quantity_change INTEGER NOT NULL,
      reason TEXT NOT NULL,
      quick_pick_reason TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
  `)

  // Sales
  database.exec(`
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      type TEXT DEFAULT 'retail',
      status TEXT DEFAULT 'completed',
      subtotal REAL NOT NULL,
      discount_amount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      total_amount REAL NOT NULL,
      paid_amount REAL NOT NULL,
      payment_method TEXT DEFAULT 'cash',
      note TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // Sale Items
  database.exec(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      product_id TEXT,
      variation_name TEXT,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      discount REAL DEFAULT 0,
      total_price REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
  `)

  // Held Sales (cart persistence)
  database.exec(`
    CREATE TABLE IF NOT EXISTS held_sales (
      id TEXT PRIMARY KEY,
      name TEXT,
      cart_items TEXT NOT NULL,
      payment_method TEXT DEFAULT 'cash',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // Offer Combos
  database.exec(`
    CREATE TABLE IF NOT EXISTS offer_combos (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'combo',
      discount_type TEXT,
      discount_value REAL,
      applicable_products TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      barcode TEXT UNIQUE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // Customers (for debt tracking)
  database.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      notes TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // Debts (sales recorded as debt)
  database.exec(`
    CREATE TABLE IF NOT EXISTS debts (
      id TEXT PRIMARY KEY,
      customer_id TEXT,
      sale_id TEXT,
      amount REAL NOT NULL,
      amount_paid REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      due_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (sale_id) REFERENCES sales(id)
    );
  `)

  // Debt payments (partial repayments)
  database.exec(`
    CREATE TABLE IF NOT EXISTS debt_payments (
      id TEXT PRIMARY KEY,
      debt_id TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT DEFAULT 'cash',
      reference TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (debt_id) REFERENCES debts(id)
    );
  `)

  // Create indexes
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
    CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
    CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at);
  `)

  log.info('Database tables created')
}

function seedDefaultData(): void {
  const database = getDatabase()

  // Insert default shop settings if not exists
  const existingSettings = database.prepare('SELECT id FROM shop_settings WHERE id = ?').get('default')
  if (!existingSettings) {
    database.prepare(`
      INSERT INTO shop_settings (id, name, currency)
      VALUES ('default', 'My Shop', 'KES')
    `).run()
    log.info('Default shop settings created')
  }

  // Insert default categories if none exist
  const categoryCount = database.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number }
  if (categoryCount.count === 0) {
    const defaultCategories = [
      { name: 'General', color: '#6366f1', icon: 'package' },
      { name: 'Food & Drinks', color: '#22c55e', icon: 'coffee' },
      { name: 'Electronics', color: '#f59e0b', icon: 'smartphone' },
      { name: 'Clothing', color: '#ec4899', icon: 'shirt' },
    ]

    const insert = database.prepare(`
      INSERT INTO categories (id, name, color, icon, display_order)
      VALUES (?, ?, ?, ?, ?)
    `)

    defaultCategories.forEach((cat, index) => {
      insert.run(`cat_${index + 1}`, cat.name, cat.color, cat.icon, index)
    })
    log.info('Default categories created')
  }
}
