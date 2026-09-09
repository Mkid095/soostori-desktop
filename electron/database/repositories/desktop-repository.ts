/**
 * DesktopRepository<T> — platform-specific storage adapter.
 *
 * Wraps a single better-sqlite3 table behind the published SDK contract:
 *
 *     @soostori/storage.Repository<T>
 *
 * This file lives in soostori-desktop (not the SDK) because it imports
 * the Desktop-only better-sqlite3 dependency. The SDK stays SQLite-agnostic.
 */

import type {
  Repository,
  TransactionHandle,
} from '@soostori/storage'
import type { UUID } from '@soostori/core'
import type { Database as SqliteDatabase } from 'better-sqlite3'

import { getDatabase } from '../index'

function buildWhere(
  filter: Record<string, unknown> | undefined,
): { sql: string; params: unknown[] } {
  if (!filter || Object.keys(filter).length === 0) {
    return { sql: '', params: [] }
  }
  const keys = Object.keys(filter)
  return {
    sql: ` WHERE ${keys.map((k) => `${k} = ?`).join(' AND ')}`,
    params: keys.map((k) => filter[k]),
  }
}

/** Desktop implementation of the SDK TransactionHandle. */
class DesktopTransactionHandle implements TransactionHandle {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly db: SqliteDatabase) {}

  async insert<T>(table: string, data: T): Promise<T> {
    const cols = Object.keys(data as Record<string, unknown>)
    this.db.prepare(
      `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
    ).run(...cols.map((c) => (data as Record<string, unknown>)[c]))
    return data
  }

  async update<T>(table: string, id: UUID, changes: Partial<T>): Promise<T> {
    const cols = Object.keys(changes as Record<string, unknown>)
    if (cols.length > 0) {
      const values = cols.map((c) => (changes as Record<string, unknown>)[c])
      this.db
        .prepare(`UPDATE ${table} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`)
        .run(...values, id)
    }
    return this.db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id) as T
  }

  async delete(table: string, id: UUID): Promise<void> {
    this.db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id)
  }

  async raw(sql: string, params?: unknown[]): Promise<unknown[]> {
    return this.db.prepare(sql).all(...(params ?? []))
  }
}

/** DesktopRepository<T> — satisfies `@soostori/storage.Repository<T>`. */
export class DesktopRepository<T> implements Repository<T> {
  private readonly db: SqliteDatabase

  constructor(
    private readonly tableName: string,
    private readonly idColumn: string = 'id',
    dbOverride?: SqliteDatabase,
  ) {
    this.db = dbOverride ?? getDatabase()
  }

  async findById(id: UUID): Promise<T | null> {
    const row = this.db
      .prepare(`SELECT * FROM ${this.tableName} WHERE ${this.idColumn} = ?`)
      .get(id)
    return (row ?? null) as T | null
  }

  async findMany(filter?: Record<string, unknown>): Promise<T[]> {
    const where = buildWhere(filter)
    return this.db
      .prepare(`SELECT * FROM ${this.tableName}${where.sql}`)
      .all(...where.params) as T[]
  }

  async create(data: T): Promise<T> {
    const cols = Object.keys(data as Record<string, unknown>)
    const values = cols.map((c) => (data as Record<string, unknown>)[c])
    this.db.prepare(
      `INSERT INTO ${this.tableName} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
    ).run(...values)
    return data
  }

  async update(id: UUID, changes: Partial<T>): Promise<T> {
    const cols = Object.keys(changes as Record<string, unknown>)
    if (cols.length > 0) {
      const values = cols.map((c) => (changes as Record<string, unknown>)[c])
      this.db.prepare(
        `UPDATE ${this.tableName} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE ${this.idColumn} = ?`,
      ).run(...values, id)
    }
    return this.db
      .prepare(`SELECT * FROM ${this.tableName} WHERE ${this.idColumn} = ?`)
      .get(id) as T
  }

  async delete(id: UUID): Promise<void> {
    this.db.prepare(`DELETE FROM ${this.tableName} WHERE ${this.idColumn} = ?`).run(id)
  }

  async transaction<R>(fn: (tx: TransactionHandle) => Promise<R>): Promise<R> {
    // Phase 10 single-writer discipline — BEGIN/COMMIT/ROLLBACK on the
    // SQLite handle. The SDK consumer code stays sequential per device.
    this.db.exec('BEGIN')
    const tx = new DesktopTransactionHandle(this.db)
    try {
      const result = await fn(tx)
      this.db.exec('COMMIT')
      return result
    } catch (err) {
      try { this.db.exec('ROLLBACK') } catch { /* swallow */ }
      throw err
    }
  }
}
