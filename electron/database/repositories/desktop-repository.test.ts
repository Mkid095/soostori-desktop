/**
 * DesktopRepository<T> — SDK contract verification.
 *
 * Validates that the platform adapter satisfies every method on
 * @soostori/storage.Repository<T> and TransactionHandle against a real
 * SQLite database. Run with:
 *
 *     npx tsx electron/database/repositories/desktop-repository.test.ts
 */

import Database from 'better-sqlite3'
import { join } from 'path'
import { tmpdir } from 'os'
import { unlinkSync } from 'fs'
import type { UUID } from '@soostori/core'
import { newId } from '@soostori/core'
import type { Repository, TransactionHandle } from '@soostori/storage'

import { DesktopRepository } from './desktop-repository'

interface ProductRow {
  id: string
  name: string
  selling_price: number
  current_stock: number
}

function openTestDb(): Database.Database {
  const file = join(tmpdir(), `soostori-repo-${Date.now()}-${Math.random()}.db`)
  const db = new Database(file)
  db.pragma('foreign_keys = ON')
  db.exec(`
    CREATE TABLE products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      selling_price REAL NOT NULL,
      current_stock INTEGER NOT NULL DEFAULT 0
    );
  `)
  process.on('exit', () => {
    try { db.close() } catch { /* */ }
    try { unlinkSync(file) } catch { /* */ }
  })
  return db
}

let passed = 0
let failed = 0

function assert(name: string, cond: boolean): void {
  if (cond) { console.log(`  ✓ ${name}`); passed++ }
  else { console.log(`  ✗ ${name}`); failed++ }
}

async function run(): Promise<void> {
  console.log('\n=== Phase 11.1 DesktopRepository<T> contract tests ===\n')

  // [1] Adapter conforms to SDK Repository<T> at the type level
  {
    const db = openTestDb()
    const repo: Repository<ProductRow> = new DesktopRepository<ProductRow>('products', 'id', db)
    assert('[1] repo satisfies Repository<T> (assignability)', repo !== null)

    const id = newId() as UUID
    const created = await repo.create({ id, name: 'Latte', selling_price: 250, current_stock: 10 })
    assert('[2] create() returns full row', created.name === 'Latte')

    const found = await repo.findById(id)
    assert('[3] findById() returns row', found?.id === id)

    const missing = await repo.findById(newId() as UUID)
    assert('[4] findById() returns null when not found', missing === null)

    const matches = await repo.findMany({ selling_price: 250 })
    assert('[5] findMany() filter returns 1 row', matches.length === 1)

    const updated = await repo.update(id, { current_stock: 5 })
    assert('[6] update() returns new state', updated.current_stock === 5)

    await repo.delete(id)
    const after = await repo.findById(id)
    assert('[7] delete() removes row', after === null)
  }

  // [8] transaction() commits on success
  {
    const db = openTestDb()
    const repo: Repository<ProductRow> = new DesktopRepository<ProductRow>('products', 'id', db)
    const id1 = newId() as UUID
    const id2 = newId() as UUID
    await repo.transaction(async (tx: TransactionHandle) => {
      await tx.insert('products', { id: id1, name: 'A', selling_price: 100, current_stock: 1 })
      await tx.insert('products', { id: id2, name: 'B', selling_price: 200, current_stock: 1 })
    })
    const rows = await repo.findMany({})
    assert('[8] transaction() commits two rows', rows.length === 2)
  }

  // [9] transaction() rolls back on throw
  {
    const db = openTestDb()
    const repo: Repository<ProductRow> = new DesktopRepository<ProductRow>('products', 'id', db)
    let threw = false
    try {
      await repo.transaction(async (tx: TransactionHandle) => {
        await tx.insert('products', {
          id: newId() as UUID,
          name: 'C',
          selling_price: 300,
          current_stock: 1,
        })
        throw new Error('rollback now')
      })
    } catch { threw = true }
    assert('[9] transaction() rethrows on failure', threw)
    const rows = await repo.findMany({})
    assert('[9] transaction() rolled back', rows.length === 0)
  }

  // [10] transaction().raw() exposes query
  {
    const db = openTestDb()
    const repo: Repository<ProductRow> = new DesktopRepository<ProductRow>('products', 'id', db)
    await repo.create({
      id: newId() as UUID,
      name: 'D',
      selling_price: 400,
      current_stock: 2,
    })
    const result = await repo.transaction(async (tx: TransactionHandle) =>
      tx.raw('SELECT COUNT(*) as n FROM products'))
    assert(
      '[10] tx.raw() returns query result',
      Array.isArray(result) && (result[0] as { n: number }).n === 1,
    )
  }

  console.log(`\nTotal: ${passed} passed, ${failed} failed`)
  process.exit(failed === 0 ? 0 : 1)
}

run().catch((err: unknown) => {
  console.error('test runner failed:', err)
  process.exit(2)
})
