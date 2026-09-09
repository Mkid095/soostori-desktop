/**
 * Phase 9.1.1 — SDK alignment schema migration.
 * Adds columns required by canonical SDK types that Desktop schema lacks.
 *
 * These columns are required by @soostori/core and @soostori/devices contracts.
 * Safe to run on existing databases — uses ALTER TABLE with IF NOT EXISTS / IF NOT EXISTS checks.
 */

import { getDatabase } from './index'
import log from 'electron-log'

export function runSdkAlignmentMigration(): void {
  const db = getDatabase()

  // devices table: add SDK-required columns
  migrateDevicesTable(db)

  // shops table: add SDK-required columns
  migrateShopsTable(db)

  // employees table: add SDK-required columns
  migrateEmployeesTable(db)

  log.info('[Phase 9.1.1] SDK alignment migration complete')
}

function migrateDevicesTable(db: import('better-sqlite3').Database): void {
  const cols = db.prepare('PRAGMA table_info(devices)').all() as { name: string }[]
  const existing = new Set(cols.map(c => c.name))

  const additions: Array<{ name: string; sql: string }> = [
    { name: 'device_id', sql: 'ALTER TABLE devices ADD COLUMN device_id TEXT' },
    { name: 'status', sql: "ALTER TABLE devices ADD COLUMN status TEXT NOT NULL DEFAULT 'offline'" },
    { name: 'authorized_at', sql: 'ALTER TABLE devices ADD COLUMN authorized_at TEXT' },
    { name: 'app_version', sql: 'ALTER TABLE devices ADD COLUMN app_version TEXT' },
    { name: 'hostname', sql: 'ALTER TABLE devices ADD COLUMN hostname TEXT' },
    { name: 'platform', sql: 'ALTER TABLE devices ADD COLUMN platform TEXT' },
  ]

  for (const col of additions) {
    if (!existing.has(col.name)) {
      try { db.exec(col.sql) } catch (e) { log.warn(`[Phase 9.1.1] devices.${col.name}: ${e}`) }
    }
  }
}

function migrateShopsTable(db: import('better-sqlite3').Database): void {
  const cols = db.prepare('PRAGMA table_info(shops)').all() as { name: string }[]
  const existing = new Set(cols.map(c => c.name))

  const additions: Array<{ name: string; sql: string }> = [
    { name: 'slug', sql: 'ALTER TABLE shops ADD COLUMN slug TEXT' },
    { name: 'tax_rate', sql: 'ALTER TABLE shops ADD COLUMN tax_rate REAL NOT NULL DEFAULT 0' },
    { name: 'plan', sql: "ALTER TABLE shops ADD COLUMN plan TEXT NOT NULL DEFAULT 'free'" },
    { name: 'subscription_expiry', sql: 'ALTER TABLE shops ADD COLUMN subscription_expiry TEXT' },
    { name: 'status', sql: "ALTER TABLE shops ADD COLUMN status TEXT NOT NULL DEFAULT 'active'" },
  ]

  for (const col of additions) {
    if (!existing.has(col.name)) {
      try { db.exec(col.sql) } catch (e) { log.warn(`[Phase 9.1.1] shops.${col.name}: ${e}`) }
    }
  }
}

function migrateEmployeesTable(db: import('better-sqlite3').Database): void {
  const cols = db.prepare('PRAGMA table_info(employees)').all() as { name: string }[]
  const existing = new Set(cols.map(c => c.name))

  const additions: Array<{ name: string; sql: string }> = [
    { name: 'email', sql: 'ALTER TABLE employees ADD COLUMN email TEXT' },
    { name: 'phone', sql: 'ALTER TABLE employees ADD COLUMN phone TEXT' },
    { name: 'status', sql: "ALTER TABLE employees ADD COLUMN status TEXT NOT NULL DEFAULT 'active'" },
    { name: 'permissions', sql: 'ALTER TABLE employees ADD COLUMN permissions TEXT' },
  ]

  for (const col of additions) {
    if (!existing.has(col.name)) {
      try { db.exec(col.sql) } catch (e) { log.warn(`[Phase 9.1.1] employees.${col.name}: ${e}`) }
    }
  }
}
