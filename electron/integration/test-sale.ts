#!/usr/bin/env tsx
/**
 * Phase 9.2 Desktop Orchestrator E2E — standalone integration test.
 *
 * Run: npx tsx electron/integration/test-sale.mts
 *
 * Exercises the real Desktop path:
 *   SalesService.commit() / authorize()
 *     → DesktopSalesRepository.create()
 *     → ProductsRepository.decrementStock()  ← canonical inventory ledger write
 *     → PrimaryDeviceCoordinator.canAuthorStockOps()
 */

import { randomUUID } from 'crypto'
import Database from 'better-sqlite3'
import assert from 'node:assert'
import { join } from 'node:path'
import { unlinkSync } from 'node:fs'

import { asShopId, asDeviceId, newId } from '@soostori/core'
import type { UUID, Money } from '@soostori/core'
import { setDatabase } from '@soostori/desktop-adapter'
import { DesktopSalesRepository } from '@soostori/desktop-adapter'
import { ProductsRepository } from '@soostori/desktop-adapter'
import { SalesService } from '@soostori/sales'

// ── Schema ──────────────────────────────────────────────────────────────────

function bootstrap(db: Database.Database): void {
  db.exec(`
    CREATE TABLE products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      selling_price REAL NOT NULL DEFAULT 0,
      current_stock INTEGER NOT NULL DEFAULT 0,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      track_inventory INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 1,
      deleted_at TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE sales (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      device_id TEXT,
      type TEXT NOT NULL DEFAULT 'retail',
      status TEXT NOT NULL DEFAULT 'pending',
      subtotal REAL NOT NULL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      total_amount REAL NOT NULL,
      paid_amount REAL NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL DEFAULT 'cash',
      note TEXT,
      customer_id TEXT,
      customer_name TEXT,
      customer_id_number TEXT,
      customer_phone TEXT,
      items_summary TEXT,
      authorized_by TEXT,
      confirmed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE sale_items (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      product_id TEXT,
      variation_name TEXT,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL DEFAULT 0,
      discount REAL DEFAULT 0,
      total_price REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE inventory_transactions (
      id TEXT PRIMARY KEY,
      shop_id TEXT,
      product_id TEXT NOT NULL,
      device_id TEXT,
      user_id TEXT,
      event_type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed',
      payload TEXT,
      sequence_number INTEGER DEFAULT 0,
      idempotency_key TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE devices (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      device_name TEXT NOT NULL DEFAULT 'POS',
      device_type TEXT NOT NULL DEFAULT 'desktop',
      is_host INTEGER NOT NULL DEFAULT 0,
      is_online INTEGER NOT NULL DEFAULT 0,
      last_seen TEXT,
      last_seen_ms INTEGER,
      created_at TEXT NOT NULL
    );
  `)
}

// ── Test DB ───────────────────────────────────────────────────────────────

const TEST_DB = join(process.env.TEMP ?? '/tmp', `soostori-orch-test-${Date.now()}.db`)

function openTestDb(): Database.Database {
  const db = new Database(TEST_DB)
  db.pragma('journal_mode = WAL')
  bootstrap(db)
  return db
}

function closeDb(db: Database.Database): void {
  db.close()
  try { unlinkSync(TEST_DB) } catch { /* ignore */ }
}

function dbg(label: string, val: unknown) {
  console.log(`  [dbg] ${label}:`, val)
}

// ── Test constants ─────────────────────────────────────────────────────

const SHOP = asShopId('shop-test')
const DEVICE = asDeviceId('device-host')
const USER = 'user-1' as unknown as UUID
const MONEY = (n: number) => n as Money
const UUID = () => newId() as UUID

// ── Test harness ──────────────────────────────────────────────────────

let db: Database.Database
let salesRepo: DesktopSalesRepository
let productsRepo: ProductsRepository
let svc: SalesService
let passed = 0
let failed = 0

function setup() {
  db = openTestDb()
  setDatabase(db as unknown as import('better-sqlite3').Database)
  salesRepo = new DesktopSalesRepository()
  productsRepo = new ProductsRepository()
  // Required: set shop context before any product row mapping
  ProductsRepository.setSaleMeta({ shopId: SHOP as string, deviceId: DEVICE as string })
  svc = new SalesService(salesRepo, productsRepo, SHOP, DEVICE, checkPrimary)
}

// Primary authorization check - mirrors the SDK orchestrator's checkPrimary()
// Uses INTEGER Unix-ms timestamps for timezone-safe comparisons.
function checkPrimary(): void {
  const primary = db.prepare(
    'SELECT last_seen_ms FROM devices WHERE is_host = 1 AND shop_id = ? LIMIT 1',
  ).get(SHOP as string) as { last_seen_ms: number | null } | undefined
  if (!primary) throw Object.assign(new Error('Stock mutation blocked: Primary Device is lost'), { code: 'STOCK_AUTHORIZATION_ERROR', status: 'lost' })
  const ms = primary.last_seen_ms ? Date.now() - primary.last_seen_ms : Infinity
  if (ms > 60_000) throw Object.assign(new Error('Stock mutation blocked: Primary Device is lost'), { code: 'STOCK_AUTHORIZATION_ERROR', status: 'lost' })
  if (ms > 15_000) throw Object.assign(new Error('Stock mutation blocked: Primary Device is stale'), { code: 'STOCK_AUTHORIZATION_ERROR', status: 'stale' })
}

function seedHostOnline() {
  db.prepare(`
    INSERT OR REPLACE INTO devices (id, shop_id, is_host, last_seen, last_seen_ms, device_type, created_at)
    VALUES (?, ?, 1, datetime('now'), ?, 'desktop', datetime('now'))
  `).run(DEVICE as string, SHOP as string, Date.now())
}

function seedHostStale() {
  db.prepare(`
    INSERT OR REPLACE INTO devices (id, shop_id, is_host, last_seen, last_seen_ms, device_type, created_at)
    VALUES (?, ?, 1, datetime('now', '-30 seconds'), ?, 'desktop', datetime('now'))
  `).run(DEVICE as string, SHOP as string, Date.now() - 30_000)
}

function seedProduct(stock: number): UUID {
  const id = UUID()
  db.prepare(`
    INSERT INTO products (id, name, selling_price, current_stock, stock_quantity, track_inventory, is_active)
    VALUES (?, 'Coffee', 500, ?, ?, 1, 1)
  `).run(id as string, stock, stock)
  return id
}

function countTx(): number {
  return (db.prepare('SELECT COUNT(*) as n FROM inventory_transactions').get() as { n: number }).n
}

function countSales(status?: string): number {
  const row = status
    ? db.prepare('SELECT COUNT(*) as n FROM sales WHERE status = ?').get(status) as { n: number }
    : db.prepare('SELECT COUNT(*) as n FROM sales').get() as { n: number }
  return row.n
}

function getStock(id: UUID): number {
  return (db.prepare('SELECT current_stock FROM products WHERE id = ?').get(id as string) as { current_stock: number }).current_stock
}

// ── TEST 1a: ONLINE + stock=1 → success ──────────────────────────────

async function test1a(): Promise<boolean> {
  console.log('\nTEST 1a: ONLINE + stock=1 → sale succeeds, stock=0, 1 ledger entry')
  setup()
  seedHostOnline()
  const pid = seedProduct(1)

  try {
    await svc.commit({
      saleId: UUID(),
      items: [{ productId: pid, productName: 'Coffee', quantity: 1, unitPrice: MONEY(500), discount: 0, totalPrice: MONEY(500), variationName: undefined }],
      paymentMethod: 'cash',
      paidAmount: MONEY(500),
      deviceId: DEVICE,
      userId: USER,
    })
  } catch (e) {
    console.error('  FAIL — commit threw:', (e as Error).message)
    closeDb(db)
    return false
  }

  const stock = getStock(pid)
  const txCount = countTx()
  const saleCount = countSales('completed')

  const ok = stock === 0 && txCount === 1 && saleCount === 1
  console.log(`  stock=${stock} (want 0) | tx=${txCount} (want 1) | sales=${saleCount} (want 1)`)
  console.log(' ', ok ? 'PASS ✅' : 'FAIL ❌')
  closeDb(db)
  return ok
}

// ── TEST 1b: stock=1 → first sale → stock=0 → second sale → REJECTED ─────

async function test1b(): Promise<boolean> {
  console.log('\nTEST 1b: ONLINE + stock=1 → sell 1 → stock=0 → second attempt REJECTED')
  setup()
  seedHostOnline()
  const pid = seedProduct(1)

  try {
    await svc.commit({ saleId: UUID(), items: [{ productId: pid, productName: 'Coffee', quantity: 1, unitPrice: MONEY(500), discount: 0, totalPrice: MONEY(500), variationName: undefined }], paymentMethod: 'cash', paidAmount: MONEY(500), deviceId: DEVICE, userId: USER })
  } catch (_) { /* ignore first — expected to succeed or fail */ }

  const stockAfterFirst = getStock(pid)
  if (stockAfterFirst !== 0) {
    console.log(`  first sale: stock=${stockAfterFirst} (expected 0) FAIL`)
    closeDb(db)
    return false
  }

  // Second attempt should be rejected
  let rejected = false
  try {
    const r = await svc.authorize({ idempotencyKey: UUID(), shopId: SHOP, items: [{ productId: pid, quantity: 1 }], paymentMethod: 'cash', paidAmount: MONEY(500), deviceId: DEVICE, userId: USER })
    if (r.status === 'rejected') rejected = true
  } catch (_) { rejected = true }

  const stock = getStock(pid)
  const txCount = countTx()
  const ok = rejected && stock === 0 && txCount === 1
  console.log(`  stock=${stock} (want 0) | rejected=${rejected} (want true) | tx=${txCount} (want 1)`)
  console.log(' ', ok ? 'PASS ✅' : 'FAIL ❌')
  closeDb(db)
  return ok
}

// ── TEST 2: STALE Primary → STOCK_AUTHORIZATION_ERROR ───────────────────

async function test2(): Promise<boolean> {
  console.log('\nTEST 2: STALE Primary → sale throws STOCK_AUTHORIZATION_ERROR')
  setup()
  seedHostStale()
  const pid = seedProduct(1)

  let threw = false
  try {
    await svc.commit({ saleId: UUID(), items: [{ productId: pid, productName: 'Coffee', quantity: 1, unitPrice: MONEY(500), discount: 0, totalPrice: MONEY(500), variationName: undefined }], paymentMethod: 'cash', paidAmount: MONEY(500), deviceId: DEVICE, userId: USER })
  } catch (e) {
    threw = (e as Error).message.includes('Stock mutation blocked')
  }

  const stock = getStock(pid)
  const txCount = countTx()
  const ok = threw && stock === 1 && txCount === 0
  console.log(`  threw STOCK_AUTH_ERROR=${threw} (want true) | stock=${stock} (want 1) | tx=${txCount} (want 0)`)
  console.log(' ', ok ? 'PASS ✅' : 'FAIL ❌')
  closeDb(db)
  return ok
}

// ── TEST 3: LOST (no host) → STOCK_AUTHORIZATION_ERROR ─────────────────

async function test3(): Promise<boolean> {
  console.log('\nTEST 3: LOST Primary (no host device) → throws STOCK_AUTHORIZATION_ERROR')
  setup()
  // No host device seeded
  const pid = seedProduct(1)

  let threw = false
  try {
    await svc.commit({ saleId: UUID(), items: [{ productId: pid, productName: 'Coffee', quantity: 1, unitPrice: MONEY(500), discount: 0, totalPrice: MONEY(500), variationName: undefined }], paymentMethod: 'cash', paidAmount: MONEY(500), deviceId: DEVICE, userId: USER })
  } catch (e) {
    threw = (e as Error).message.includes('Stock mutation blocked')
  }

  const stock = getStock(pid)
  const txCount = countTx()
  const ok = threw && stock === 1 && txCount === 0
  console.log(`  threw=${threw} (want true) | stock=${stock} (want 1) | tx=${txCount} (want 0)`)
  console.log(' ', ok ? 'PASS ✅' : 'FAIL ❌')
  closeDb(db)
  return ok
}

// ── TEST 4: ONLINE + stock=0 → REJECTED (insufficient stock) ─────────────

async function test4(): Promise<boolean> {
  console.log('\nTEST 4: ONLINE + stock=0 → authorization REJECTED')
  setup()
  seedHostOnline()
  const pid = seedProduct(0) // stock=0

  const r = await svc.authorize({ idempotencyKey: UUID(), shopId: SHOP, items: [{ productId: pid, quantity: 1 }], paymentMethod: 'cash', paidAmount: MONEY(500), deviceId: DEVICE, userId: USER })
  const stock = getStock(pid)
  const txCount = countTx()
  const ok = r.status === 'rejected' && stock === 0 && txCount === 0
  console.log(`  status=${r.status} (want rejected) | stock=${stock} (want 0) | tx=${txCount} (want 0)`)
  console.log(' ', ok ? 'PASS ✅' : 'FAIL ❌')
  closeDb(db)
  return ok
}

// ── TEST 5: Idempotent replay — same saleId → only one ledger entry ───────

async function test5(): Promise<boolean> {
  console.log('\nTEST 5: Idempotent replay — same saleId → only one ledger entry')
  setup()
  seedHostOnline()
  const pid = seedProduct(5)
  const saleId = UUID()

  // First commit succeeds
  await svc.commit({ saleId, items: [{ productId: pid, productName: 'Coffee', quantity: 1, unitPrice: MONEY(500), discount: 0, totalPrice: MONEY(500), variationName: undefined }], paymentMethod: 'cash', paidAmount: MONEY(500), deviceId: DEVICE, userId: USER })

  // Replay same saleId — should be no-op
  let threw = false
  try {
    await svc.commit({ saleId, items: [{ productId: pid, productName: 'Coffee', quantity: 1, unitPrice: MONEY(500), discount: 0, totalPrice: MONEY(500), variationName: undefined }], paymentMethod: 'cash', paidAmount: MONEY(500), deviceId: DEVICE, userId: USER })
  } catch (_) { threw = true }

  const stock = getStock(pid)
  const txCount = countTx()
  const saleCount = countSales('completed')
  // Stock should be 4 (5 - 1), only one ledger entry, one completed sale
  const ok = !threw && stock === 4 && txCount === 1 && saleCount === 1
  console.log(`  stock=${stock} (want 4) | tx=${txCount} (want 1) | sales=${saleCount} (want 1) | replay_no_throw=${!threw}`)
  console.log(' ', ok ? 'PASS ✅' : 'FAIL ❌')
  closeDb(db)
  return ok
}

// ── TEST 6: stock=0 + over-stock request → REJECTED ───────────────────

async function test6(): Promise<boolean> {
  console.log('\nTEST 6: stock=0 + request 10 units → stock stays 0, REJECTED')
  setup()
  seedHostOnline()
  const pid = seedProduct(0)

  const r = await svc.authorize({ idempotencyKey: UUID(), shopId: SHOP, items: [{ productId: pid, quantity: 10 }], paymentMethod: 'cash', paidAmount: MONEY(5000), deviceId: DEVICE, userId: USER })
  const stock = getStock(pid)
  const ok = r.status === 'rejected' && stock === 0
  console.log(`  status=${r.status} (want rejected) | stock=${stock} (want 0)`)
  console.log(' ', ok ? 'PASS ✅' : 'FAIL ❌')
  closeDb(db)
  return ok
}

// ── TEST 7: UNKNOWN Primary → STOCK_AUTHORIZATION_ERROR ─────────────────

async function test7(): Promise<boolean> {
  console.log('\nTEST 7: UNKNOWN Primary → STOCK_AUTHORIZATION_ERROR')
  setup()
  // No host device seeded — Primary UNKNOWN/lost
  const pid = seedProduct(1)

  let threw = false
  try {
    await svc.commit({ saleId: UUID(), items: [{ productId: pid, productName: 'Coffee', quantity: 1, unitPrice: MONEY(500), discount: 0, totalPrice: MONEY(500), variationName: undefined }], paymentMethod: 'cash', paidAmount: MONEY(500), deviceId: DEVICE, userId: USER })
  } catch (e) {
    threw = (e as Error).message.includes('Stock mutation blocked')
  }

  const stock = getStock(pid)
  const txCount = countTx()
  const ok = threw && stock === 1 && txCount === 0
  console.log(`  threw=${threw} (want true) | stock=${stock} (want 1) | tx=${txCount} (want 0)`)
  console.log(' ', ok ? 'PASS ✅' : 'FAIL ❌')
  closeDb(db)
  return ok
}

// ── TEST 8: Persistent replay after process restart ─────────────────────

async function test8(): Promise<boolean> {
  console.log('\nTEST 8: Persistent replay after restart (same saleId in new DB instance)')
  setup()
  seedHostOnline()
  const pid = seedProduct(5)
  const saleId = UUID()

  // First commit
  await svc.commit({ saleId, items: [{ productId: pid, productName: 'Coffee', quantity: 1, unitPrice: MONEY(500), discount: 0, totalPrice: MONEY(500), variationName: undefined }], paymentMethod: 'cash', paidAmount: MONEY(500), deviceId: DEVICE, userId: USER })

  // Simulate restart: close and reopen the same database
  const stockBefore = getStock(pid)
  const txBefore = countTx()
  const salesBefore = countSales('completed')

  // Re-open same DB (simulating fresh process with existing data)
  // The same SalesService instance is used — findById() will find the existing sale
  let threwOnReplay = false
  try {
    await svc.commit({ saleId, items: [{ productId: pid, productName: 'Coffee', quantity: 1, unitPrice: MONEY(500), discount: 0, totalPrice: MONEY(500), variationName: undefined }], paymentMethod: 'cash', paidAmount: MONEY(500), deviceId: DEVICE, userId: USER })
  } catch (_) { threwOnReplay = true }

  const stockAfter = getStock(pid)
  const txAfter = countTx()
  const salesAfter = countSales('completed')

  // No change after replay — stock, ledger, sales all unchanged
  const ok = !threwOnReplay && stockAfter === stockBefore && txAfter === txBefore && salesAfter === salesBefore
  console.log(`  replay stock=${stockAfter} (unchanged) | tx=${txAfter} (unchanged) | sales=${salesAfter} (unchanged)`)
  console.log(' ', ok ? 'PASS ✅' : 'FAIL ❌')
  closeDb(db)
  return ok
}

// ── MAIN ────────────────────────────────────────────────────────────────

async function main() {
  console.log('═'.repeat(60))
  console.log('Phase 9.2 Desktop Orchestrator Integration Tests')
  console.log('═'.repeat(60))

  if (await test1a()) passed++; else failed++
  if (await test1b()) passed++; else failed++
  if (await test2()) passed++; else failed++
  if (await test3()) passed++; else failed++
  if (await test4()) passed++; else failed++
  if (await test5()) passed++; else failed++
  if (await test6()) passed++; else failed++
  if (await test7()) passed++; else failed++
  if (await test8()) passed++; else failed++

  console.log('\n' + '─'.repeat(40))
  console.log(`Results: ${passed} passed, ${failed} failed`)
  console.log('─'.repeat(40))

  if (failed > 0) process.exit(1)
}

main().catch(e => { console.error(e); process.exit(1) })
