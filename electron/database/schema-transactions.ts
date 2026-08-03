import { getDatabase } from './index'

export function createTransactionTables(): void {
  const database = getDatabase()

  database.exec(`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY, product_id TEXT NOT NULL,
      type TEXT NOT NULL, quantity INTEGER NOT NULL,
      balance_after INTEGER NOT NULL, reason TEXT, reference_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP, created_by TEXT,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS stock_adjustment_log (
      id TEXT PRIMARY KEY, product_id TEXT NOT NULL, user_id TEXT,
      quantity_before INTEGER NOT NULL, quantity_after INTEGER NOT NULL,
      quantity_change INTEGER NOT NULL, reason TEXT NOT NULL,
      quick_pick_reason TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY, type TEXT DEFAULT 'retail',
      status TEXT DEFAULT 'completed', subtotal REAL NOT NULL,
      discount_amount REAL DEFAULT 0, tax_amount REAL DEFAULT 0,
      total_amount REAL NOT NULL, paid_amount REAL NOT NULL,
      payment_method TEXT DEFAULT 'cash', note TEXT,
      customer_id_number TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY, sale_id TEXT NOT NULL, product_id TEXT,
      variation_name TEXT, product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL, unit_price REAL NOT NULL,
      discount REAL DEFAULT 0, total_price REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS held_sales (
      id TEXT PRIMARY KEY, name TEXT, cart_items TEXT NOT NULL,
      payment_method TEXT DEFAULT 'cash',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id)
  `)
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id)
  `)
}
