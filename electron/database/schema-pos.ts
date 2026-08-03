import { getDatabase } from './index'
import log from 'electron-log'

export function createPosTables(): void {
  const database = getDatabase()

  database.exec(`
    CREATE TABLE IF NOT EXISTS shop_settings (
      id TEXT PRIMARY KEY DEFAULT 'default',
      name TEXT NOT NULL DEFAULT 'My Shop',
      address TEXT, phone TEXT, email TEXT,
      currency TEXT DEFAULT 'KES',
      receipt_footer TEXT, receipt_prefix TEXT DEFAULT 'INV',
      low_stock_threshold INTEGER DEFAULT 5,
      mpesa_send_money_phone TEXT, mpesa_paybill_number TEXT,
      mpesa_paybill_account TEXT, bank_paybill_number TEXT,
      bank_paybill_account TEXT, mpesa_pochi_phone TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      id TEXT PRIMARY KEY DEFAULT 'default',
      default_theme TEXT DEFAULT 'light',
      default_language TEXT DEFAULT 'en',
      login_pin TEXT DEFAULT '0000',
      pin_set INTEGER DEFAULT 0,
      last_login TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, icon TEXT,
      color TEXT DEFAULT '#6366f1', display_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY, category_id TEXT, name TEXT NOT NULL,
      sku TEXT, barcode TEXT UNIQUE, description TEXT, image_url TEXT,
      cost_price REAL DEFAULT 0, selling_price REAL NOT NULL,
      discount_price REAL, unit TEXT DEFAULT 'piece',
      stock_quantity INTEGER DEFAULT 0, low_stock_threshold INTEGER DEFAULT 5,
      track_inventory INTEGER DEFAULT 1, has_variants INTEGER DEFAULT 0,
      parent_variant_id TEXT, expiry_date TEXT, metadata TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP, deleted_at TEXT,
      distributor_name TEXT, distributor_phone TEXT,
      barcode_generated INTEGER DEFAULT 0,
      allow_single_unit_sale INTEGER DEFAULT 1,
      units_per_package INTEGER, box_buying_price REAL,
      bulk_selling_price REAL, group_prices TEXT,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )
  `)

  migrateProductsTable(database)
  migrateAppSettingsTable(database)

  database.exec(`
    CREATE TABLE IF NOT EXISTS product_variants (
      id TEXT PRIMARY KEY, product_id TEXT NOT NULL, name TEXT NOT NULL,
      sku TEXT, barcode TEXT UNIQUE, cost_price REAL, selling_price REAL,
      stock_quantity INTEGER DEFAULT 0, metadata TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `)

  log.info('POS tables created')
}

function migrateProductsTable(database: import('better-sqlite3').Database): void {
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
}

function migrateAppSettingsTable(database: import('better-sqlite3').Database): void {
  const existingTables = database.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]
  if (!existingTables.find(t => t.name === 'app_settings')) {
    database.exec(`
      CREATE TABLE IF NOT EXISTS app_settings (
        id TEXT PRIMARY KEY DEFAULT 'default',
        default_theme TEXT DEFAULT 'light',
        default_language TEXT DEFAULT 'en',
        login_pin TEXT DEFAULT '0000',
        pin_set INTEGER DEFAULT 0,
        last_login TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)
    database.prepare(`INSERT OR IGNORE INTO app_settings (id, default_theme, default_language, login_pin, pin_set) VALUES ('default', 'light', 'en', '0000', 0)`).run()
  }
}
