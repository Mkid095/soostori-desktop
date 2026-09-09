/**
 * Phase 9.2 E2E integration tests — real Desktop SDK sale path.
 *
 * Run with:  npx tsx electron/integration/sale-orchestrator.test.ts
 *
 * Tests the actual wired path:
 *   commitSale() → SalesService.commit()
 *     → DesktopSalesRepository.create()
 *     → ProductsRepository.decrementStock()  ← inventory ledger
 *     → PrimaryDeviceCoordinator.canAuthorStockOps()
 *     → getEventBus().publish(SALE_COMPLETED)
 */

import { randomUUID } from 'crypto'
import Database from 'better-sqlite3'
import { mkdirSync, unlinkSync } from 'fs'
import { join, dirname } from 'path'

// ── Test database setup ─────────────────────────────────────────────────

const TEST_DB = join(process.env.TEMP || '/tmp', `soostori-test-${Date.now()}.db`)

function openTestDb(): Database.Database {
  const db = new Database(TEST_DB)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  bootstrapSchema(db)
  return db
}

function bootstrapSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      category_id TEXT,
      name TEXT NOT NULL,
      sku TEXT,
      barcode TEXT UNIQUE,
      description TEXT,
      image_url TEXT,
      cost_price REAL DEFAULT 0,
      selling_price REAL NOT NULL,
      discount_price REAL,
      unit TEXT DEFAULT 'piece',
      stock_quantity INTEGER DEFAULT 0,
      current_stock INTEGER DEFAULT 0,
      low_stock_threshold INTEGER DEFAULT 5,
      track_inventory INTEGER DEFAULT 1,
      has_variants INTEGER DEFAULT 0,
      parent_variant_id TEXT,
      expiry_date TEXT,
      metadata TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT,
      distributor_name TEXT,
      distributor_phone TEXT,
      barcode_generated INTEGER DEFAULT 0,
      allow_single_unit_sale INTEGER DEFAULT 1,
      units_per_package INTEGER,
      box_buying_price REAL,
      bulk_selling_price REAL,
      group_prices TEXT
    );

    CREATE TABLE IF NOT EXISTS sale_items (
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

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      device_id TEXT,
      customer_id TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      subtotal REAL NOT NULL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      total_amount REAL NOT NULL,
      paid_amount REAL NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL DEFAULT 'cash',
      type TEXT NOT NULL DEFAULT 'retail',
      status TEXT NOT NULL DEFAULT 'pending',
      note TEXT,
      items_summary TEXT,
      customer_id_number TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS inventory_transactions (
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
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      employee_id TEXT,
      device_name TEXT NOT NULL DEFAULT 'POS',
      device_type TEXT NOT NULL DEFAULT 'desktop',
      capabilities TEXT NOT NULL DEFAULT '{}',
      is_host INTEGER NOT NULL DEFAULT 0,
      is_online INTEGER NOT NULL DEFAULT 0,
      last_seen TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS held_sales (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      user_id TEXT,
      name TEXT,
      cart_items TEXT NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'cash',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)
}

function closeDb(db: Database.Database): void {
  db.close()
  try { unlinkSync(TEST_DB) } catch { /* ignore cleanup errors */ }
}

// ── Test harness ─────────────────────────────────────────────────────────

let db: Database.Database

// Simple event bus for tests
const eventBus: Array<{ name: string; payload: unknown }> = []

// Mock getEventBus
const mockGetEventBus = () => ({
  publish: (event: { name: string; payload: unknown }) => {
    eventBus.push({ name: event.name, payload: event.payload })
  },
  on: () => {},
  clear: () => { eventBus.length = 0 },
})

// ── Tests ──────────────────────────────────────────────────────────────

import { asShopId, asDeviceId, newId } from '@soostori/core'
import { DesktopSalesRepository, ProductsRepository, setDatabase } from '@soostori/desktop-adapter'
import { SalesService } from '@soostori/sales'

let salesService: SalesService

function init(db_: Database.Database) {
  db = db_
  setDatabase(db)
  eventBus.length = 0

  const shopId = asShopId('shop-test')
  const deviceId = asDeviceId('device-host')
  const salesRepo = new DesktopSalesRepository()
  const productsRepo = new ProductsRepository()
  // Set shop context for row mappers before any product query runs
  ProductsRepository.setSaleMeta({ shopId: shopId as string, deviceId: deviceId as string })

  // Seed a host device
  db.prepare(`
    INSERT OR IGNORE INTO devices (id, shop_id, device_name, is_host, last_seen)
    VALUES (?, ?, 'HOST', 1, datetime('now'))
  `).run(deviceId as string, shopId as string)

  salesService = new SalesService(salesRepo, productsRepo, shopId, deviceId)
}

async function commitSale(args: Parameters<typeof salesService.commit>[0]) {
  return salesService.commit(args)
}

async function authorizeSale(args: Parameters<typeof salesService.authorize>[0]) {
  return salesService.authorize(args)
}

// ── TEST 1: Host ONLINE + Single Till + Stock=1 → Success ──────────────────────────

async function test1() {
  console.log('\n=== TEST 1: Host ONLINE + stock=1 + single sale ===')
  const db = openTestDb()

  const shopId = asShopId('shop-1')
  const deviceId = asDeviceId('device-host-1')
  const productId = newId()
  const saleId = newId()

  init(db)

  // Seed product with stock=1
  db.prepare(`
    INSERT INTO products (id, name, selling_price, current_stock, stock_quantity, track_inventory, is_active)
    VALUES (?, 'Test Coffee', 500, 1, 1, 1, 1)
  `).run(productId as string)

  // Seed host device as ONLINE (last_seen = now)
  db.prepare(`
    INSERT OR REPLACE INTO devices (id, shop_id, device_name, is_host, last_seen)
    VALUES (?, ?, 'HOST', 1, datetime('now'))
  `).run(deviceId as string, shopId as string)

  // Attempt sale
  const result = await commitSale({
    saleId: saleId as import('@soostori/core').UUID,
    items: [{ productId: productId as import('@soostori/core').UUID, productName: 'Test Coffee', quantity: 1, unitPrice: 500 as import('@soostori/core').Money, discount: 0, totalPrice: 500 as import('@soostori/core').Money }],
    paymentMethod: 'cash',
    paidAmount: 500 as import('@soostori/core').Money,
    deviceId: deviceId as import('@soostori/core').UUID,
    userId: 'user-1' as import('@soostori/core').UUID,
  })

  // Verify
  const stock = (db.prepare('SELECT current_stock FROM products WHERE id = ?').get(productId as string) as { current_stock: number }).current_stock
  const txCount = (db.prepare('SELECT COUNT(*) as n FROM inventory_transactions').get() as { n: number }).n
  const saleRow = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId as string)

  console.log('  Stock after sale:', stock, '(expected 0)')
  console.log('  Ledger entries:', txCount, '(expected 1)')
  console.log('  Sale created:', saleRow ? 'YES' : 'NO')

  const passed = stock === 0 && txCount === 1 && saleRow !== undefined
  console.log('  RESULT:', passed ? 'PASS ✅' : 'FAIL ❌')
  closeDb(db)
  return passed
}

// Run tests sequentially
async function runAll() {
  console.log('Starting Phase 9.2 Integration Tests...')
  let passed = 0
  let failed = 0

  try { if (await test1()) passed++; else failed++ } catch (e) { console.error('TEST 1 ERROR:', e); failed++ }

  console.log(`\n${passed} passed, ${failed} failed`)
  process.exit(failed > 0 ? 1 : 0)
}

runAll()
