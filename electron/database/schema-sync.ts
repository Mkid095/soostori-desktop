import { getDatabase } from './index'

export function createSyncTables(): void {
  const database = getDatabase()

  database.exec(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id              TEXT PRIMARY KEY,
      table_name      TEXT NOT NULL,
      record_local_id TEXT NOT NULL,
      action          TEXT NOT NULL,
      payload         TEXT NOT NULL,
      status          TEXT DEFAULT 'pending',
      retry_count     INTEGER DEFAULT 0,
      error_message   TEXT,
      created_at      INTEGER NOT NULL,
      synced_at       INTEGER
    )
  `)
  database.exec(`CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status)`)

  database.exec(`
    CREATE TABLE IF NOT EXISTS sync_id_map (
      table_name      TEXT NOT NULL,
      local_id        TEXT NOT NULL,
      server_id       TEXT NOT NULL,
      synced_at       INTEGER NOT NULL,
      PRIMARY KEY (table_name, local_id)
    )
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS sync_metadata (
      key    TEXT PRIMARY KEY,
      value  TEXT
    )
  `)

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)
  `)
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)
  `)
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active)
  `)
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at)
  `)
}
