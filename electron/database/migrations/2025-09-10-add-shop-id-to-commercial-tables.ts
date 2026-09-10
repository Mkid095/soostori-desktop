/**
 * Cycle 03 Sub-G — Business isolation migration (§7).
 *
 * Adds shop_id TEXT NOT NULL DEFAULT 'default' to seven commercial tables that
 * previously had no business scope: products, categories, customers, sales,
 * sale_items, debts, expenses.
 *
 * Idempotency: uses PRAGMA table_info to skip columns that already exist.
 * Backfill: copies the current shop's id (SELECT id FROM shops LIMIT 1) into
 * existing rows so the column becomes NOT NULL-safe on legacy DBs.
 *
 * Reversibility (down migration):
 *   ALTER TABLE products      DROP COLUMN shop_id
 *   ALTER TABLE categories    DROP COLUMN shop_id
 *   ALTER TABLE customers     DROP COLUMN shop_id
 *   ALTER TABLE sales         DROP COLUMN shop_id
 *   ALTER TABLE sale_items    DROP COLUMN shop_id
 *   ALTER TABLE debts         DROP COLUMN shop_id
 *   ALTER TABLE expenses      DROP COLUMN shop_id
 *
 * NOTE: SQLite does NOT support DROP COLUMN for tables with indexes / FKs
 * referencing the column without a table rebuild. The down migration above is
 * therefore a soft target — for production rollback, the recommended path is
 * to restore from a pre-migration backup.
 *
 * FK constraint: REFERENCES shops(id) is enforced by the application layer
 * (the shops table is the canonical reference). NOT added inline because
 * SQLite's ALTER TABLE cannot add a NOT NULL FK without a full rebuild and
 * PRAGMA foreign_keys = ON would reject any pre-existing row whose shop_id
 * has no shops match during backfill.
 */

import log from 'electron-log'
import { getDatabase } from '../index'

const COMMERCIAL_TABLES = [
  'products',
  'categories',
  'customers',
  'sales',
  'sale_items',
  'debts',
  'expenses',
  'held_sales',
] as const

type TableName = (typeof COMMERCIAL_TABLES)[number]

/** Resolve the id we should backfill any pre-existing rows with. */
function resolveBackfillShopId(db: import('better-sqlite3').Database): string {
  const row = db.prepare('SELECT id FROM shops ORDER BY created_at ASC LIMIT 1').get() as { id: string } | undefined
  if (row?.id) return row.id
  // Fall back to legacy default — DB had no shops row at migration time.
  return 'default'
}

/**
 * Add shop_id column + backfill on a single table. No-op if column already exists.
 * Returns true if the column was added (or backfilled), false if it was already there.
 */
function migrateTable(db: import('better-sqlite3').Database, table: TableName, backfillShopId: string): boolean {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
  if (cols.some(c => c.name === 'shop_id')) {
    log.info(`[shop-id migration] ${table}.shop_id already present — skipping column add`)
    return false
  }
  log.info(`[shop-id migration] adding shop_id to ${table} (backfill=${backfillShopId})`)
  db.exec(`ALTER TABLE ${table} ADD COLUMN shop_id TEXT NOT NULL DEFAULT 'default'`)
  // Backfill — UPDATE WHERE keeps the default literal aligned with the column default.
  const updated = db.prepare(`UPDATE ${table} SET shop_id = ? WHERE shop_id = 'default' OR shop_id IS NULL`).run(backfillShopId)
  log.info(`[shop-id migration] ${table} backfill updated=${updated.changes}`)
  // Index by shop_id for query performance (used by every scoped handler).
  db.exec(`CREATE INDEX IF NOT EXISTS idx_${table}_shop_id ON ${table}(shop_id)`)
  return true
}

export function runShopIdMigration(): void {
  const db = getDatabase()
  // Sanity check: commercial tables must exist before we add shop_id.
  const existing = new Set(
    (db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>)
      .map(r => r.name)
  )
  const backfillShopId = resolveBackfillShopId(db)
  log.info(`[shop-id migration] backfill shop_id=${backfillShopId}`)
  for (const table of COMMERCIAL_TABLES) {
    if (!existing.has(table)) {
      log.warn(`[shop-id migration] table ${table} missing in schema — skipping`)
      continue
    }
    migrateTable(db, table, backfillShopId)
  }
  log.info('[shop-id migration] complete')
}
