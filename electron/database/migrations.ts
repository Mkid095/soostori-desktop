import { getDatabase } from './index'
import log from 'electron-log'

const CURRENT_VERSION = 1

export function runMigrations(): void {
  const db = getDatabase()

  // Ensure migrations table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  const row = db.prepare('SELECT MAX(version) as version FROM schema_migrations').get() as { version: number | null } | undefined
  const appliedVersion = row?.version ?? 0

  if (appliedVersion >= CURRENT_VERSION) {
    log.info(`Schema migrations: already at version ${appliedVersion}`)
    return
  }

  log.info(`Schema migrations: applying ${appliedVersion} → ${CURRENT_VERSION}`)

  const migrate = (version: number, fn: () => void) => {
    if (appliedVersion >= version) return
    db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(version)
    fn()
    log.info(`Migration v${version} applied`)
  }

  // Migrate v1: add current_stock to products if missing
  migrate(1, () => {
    const cols = (db.prepare("PRAGMA table_info(products)").all() as { name: string }[])
    if (!cols.find(c => c.name === 'current_stock')) {
      db.exec('ALTER TABLE products ADD COLUMN current_stock INTEGER DEFAULT 0')
    }
  })

  log.info(`Schema migrations complete: now at version ${CURRENT_VERSION}`)
}
