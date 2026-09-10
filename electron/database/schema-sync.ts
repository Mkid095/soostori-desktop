import { getDatabase } from './index'

export function createSyncTables(): void {
  const database = getDatabase()

  migrateSyncEventsTable(database)
  migrateInventoryTransactionsTable(database)

  // Offline event retry queue
  database.exec(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id          TEXT PRIMARY KEY,
      device_id   TEXT NOT NULL,
      event_type  TEXT NOT NULL,
      payload     TEXT NOT NULL,
      status      TEXT DEFAULT 'pending',
      retry_count INTEGER DEFAULT 0,
      created_at  TEXT NOT NULL
    )
  `)
  database.exec(`CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status)`)
  database.exec(`CREATE INDEX IF NOT EXISTS idx_sync_queue_device ON sync_queue(device_id)`)

  // Sequence-numbered event log — authoritative source of truth for sync
  database.exec(`
    CREATE TABLE IF NOT EXISTS sync_events (
      id              TEXT PRIMARY KEY,
      shop_id         TEXT NOT NULL,
      device_id       TEXT NOT NULL,
      event_type      TEXT NOT NULL,
      payload         TEXT NOT NULL,
      sequence_number INTEGER NOT NULL,
      idempotency_key TEXT,
      version         INTEGER DEFAULT 0,
      timestamp       TEXT,
      synced_at       TEXT,
      created_at      TEXT NOT NULL
    )
  `)
  database.exec(`CREATE INDEX IF NOT EXISTS idx_sync_events_shop ON sync_events(shop_id)`)
  database.exec(`CREATE INDEX IF NOT EXISTS idx_sync_events_seq ON sync_events(sequence_number)`)

  // Inventory event ledger — source of truth for stock (products.current_stock is cached)
  database.exec(`
    CREATE TABLE IF NOT EXISTS inventory_transactions (
      id              TEXT PRIMARY KEY,
      shop_id         TEXT NOT NULL,
      product_id      TEXT NOT NULL,
      device_id       TEXT NOT NULL,
      user_id         TEXT NOT NULL,
      event_type      TEXT NOT NULL,
      quantity        INTEGER NOT NULL,
      balance_after   INTEGER NOT NULL,
      status          TEXT DEFAULT 'confirmed',
      payload         TEXT,
      sequence_number INTEGER DEFAULT 0,
      idempotency_key TEXT,
      version         INTEGER DEFAULT 0,
      timestamp      TEXT,
      created_at      TEXT NOT NULL
    )
  `)
  database.exec(`CREATE INDEX IF NOT EXISTS idx_inv_tx_product ON inventory_transactions(product_id)`)
  database.exec(`CREATE INDEX IF NOT EXISTS idx_inv_tx_shop ON inventory_transactions(shop_id)`)
  database.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_inv_tx_idemokey ON inventory_transactions(idempotency_key) WHERE idempotency_key IS NOT NULL`)

  // Fast-join snapshots for new devices joining the LAN
  database.exec(`
    CREATE TABLE IF NOT EXISTS inventory_snapshots (
      id              TEXT PRIMARY KEY,
      shop_id         TEXT NOT NULL,
      product_count   INTEGER NOT NULL,
      last_sequence   INTEGER NOT NULL,
      created_at      TEXT NOT NULL
    )
  `)

  // Processed-event deduplication — prevents duplicate processing on reconnect/replay
  database.exec(`
    CREATE TABLE IF NOT EXISTS sync_processed (
      id              TEXT PRIMARY KEY,
      device_id      TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      event_id       TEXT NOT NULL,
      processed_at   TEXT NOT NULL
    )
  `)
  database.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_sync_processed_key ON sync_processed(device_id, idempotency_key)`)

  // Offline conflict queue — SALE_REJECTED events stored here for manager review
  database.exec(`
    CREATE TABLE IF NOT EXISTS sync_conflicts (
      id           TEXT PRIMARY KEY,
      shop_id      TEXT NOT NULL,
      sale_id      TEXT,
      device_id    TEXT NOT NULL,
      employee_id  TEXT NOT NULL,
      reason       TEXT NOT NULL,
      payload      TEXT NOT NULL,
      status       TEXT DEFAULT 'pending',
      resolved_by  TEXT,
      resolved_at  TEXT,
      created_at   TEXT NOT NULL
    )
  `)
  database.exec(`CREATE INDEX IF NOT EXISTS idx_sync_conflicts_status ON sync_conflicts(status)`)

  // Phase 05: products.version column for version-based conflict detection
  migrateProductsVersionColumn(database)

  // Cross-device sale record — written by host after SALE_CONFIRMED, by client after local commit
  database.exec(`
    CREATE TABLE IF NOT EXISTS sync_sales (
      id              TEXT PRIMARY KEY,
      shop_id         TEXT NOT NULL,
      sale_id         TEXT NOT NULL,
      employee_id     TEXT NOT NULL,
      device_id       TEXT NOT NULL,
      status          TEXT NOT NULL DEFAULT 'pending',
      payment_method  TEXT,
      total           REAL NOT NULL DEFAULT 0,
      items_count     INTEGER,
      payload         TEXT,
      created_at      TEXT NOT NULL
    )
  `)
  database.exec(`CREATE INDEX IF NOT EXISTS idx_sync_sales_shop ON sync_sales(shop_id)`)
  database.exec(`CREATE INDEX IF NOT EXISTS idx_sync_sales_status ON sync_sales(status)`)

  database.exec(`CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)`)
  database.exec(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)`)
  database.exec(`CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active)`)
  database.exec(`CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at)`)
}

function migrateSyncEventsTable(database: import('better-sqlite3').Database): void {
  const cols = database.prepare("PRAGMA table_info(sync_events)").all() as { name: string }[]
  const existing = cols.map(c => c.name)
  if (!existing.includes('idempotency_key')) {
    database.exec('ALTER TABLE sync_events ADD COLUMN idempotency_key TEXT')
  }
  if (!existing.includes('version')) {
    database.exec('ALTER TABLE sync_events ADD COLUMN version INTEGER DEFAULT 0')
  }
  if (!existing.includes('timestamp')) {
    database.exec('ALTER TABLE sync_events ADD COLUMN timestamp TEXT')
  }
}

function migrateInventoryTransactionsTable(database: import('better-sqlite3').Database): void {
  const cols = database.prepare("PRAGMA table_info(inventory_transactions)").all() as { name: string }[]
  const existing = cols.map(c => c.name)
  if (!existing.includes('version')) {
    database.exec('ALTER TABLE inventory_transactions ADD COLUMN version INTEGER DEFAULT 0')
  }
  if (!existing.includes('timestamp')) {
    database.exec('ALTER TABLE inventory_transactions ADD COLUMN timestamp TEXT')
  }
}

function migrateProductsVersionColumn(database: import('better-sqlite3').Database): void {
  const cols = database.prepare("PRAGMA table_info(products)").all() as { name: string }[]
  const existing = cols.map(c => c.name)
  if (!existing.includes('version')) {
    database.exec('ALTER TABLE products ADD COLUMN version INTEGER DEFAULT 1')
  }
}
