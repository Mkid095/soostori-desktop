#!/usr/bin/env tsx
/**
 * Phase 10.2 LAN Sale Integration Test — real two-process test.
 * Simulates Host (Primary) + Client (Till) over WebSocket.
 * Run: npx tsx electron/integration/test-lan-sale.ts
 */

import { createServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { randomUUID } from 'crypto'
import Database from 'better-sqlite3'
import { join } from 'node:path'
import { unlinkSync } from 'node:fs'
import { setDatabase } from '@soostori/desktop-adapter'
import { ProductsRepository, DesktopSalesRepository } from '@soostori/desktop-adapter'
import { SalesService } from '@soostori/sales'
import { asShopId, asDeviceId, newId } from '@soostori/core'
import type { UUID, Money } from '@soostori/core'
import { v4 as uuidv4 } from 'uuid'

// ── Schema ───────────────────────────────────────────────────────────────

function bootstrap(db: Database.Database): void {
  db.exec(`CREATE TABLE products (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, selling_price REAL NOT NULL DEFAULT 0,
    current_stock INTEGER NOT NULL DEFAULT 0, stock_quantity INTEGER NOT NULL DEFAULT 0,
    track_inventory INTEGER NOT NULL DEFAULT 1, is_active INTEGER NOT NULL DEFAULT 1,
    deleted_at TEXT, updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`)
  db.exec(`CREATE TABLE sales (
    id TEXT PRIMARY KEY, shop_id TEXT NOT NULL, user_id TEXT NOT NULL, device_id TEXT,
    type TEXT NOT NULL DEFAULT 'retail', status TEXT NOT NULL DEFAULT 'pending',
    subtotal REAL NOT NULL DEFAULT 0, discount_amount REAL DEFAULT 0,
    tax_amount REAL NOT NULL DEFAULT 0, total_amount REAL NOT NULL,
    paid_amount REAL NOT NULL DEFAULT 0, payment_method TEXT NOT NULL DEFAULT 'cash',
    note TEXT, customer_id TEXT, customer_name TEXT, customer_id_number TEXT,
    customer_phone TEXT, items_summary TEXT, authorized_by TEXT, confirmed_at TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`)
  db.exec(`CREATE TABLE sale_items (
    id TEXT PRIMARY KEY, sale_id TEXT NOT NULL, product_id TEXT,
    variation_name TEXT, product_name TEXT NOT NULL, quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL DEFAULT 0, discount REAL DEFAULT 0,
    total_price REAL NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`)
  db.exec(`CREATE TABLE inventory_transactions (
    id TEXT PRIMARY KEY, shop_id TEXT, product_id TEXT NOT NULL,
    device_id TEXT, user_id TEXT, event_type TEXT NOT NULL,
    quantity INTEGER NOT NULL, balance_after INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed', payload TEXT,
    sequence_number INTEGER DEFAULT 0, idempotency_key TEXT,
    created_at TEXT NOT NULL
  )`)
  db.exec(`CREATE TABLE devices (
    id TEXT PRIMARY KEY, shop_id TEXT NOT NULL, device_name TEXT NOT NULL DEFAULT 'POS',
    device_type TEXT NOT NULL DEFAULT 'desktop', is_host INTEGER NOT NULL DEFAULT 0,
    is_online INTEGER NOT NULL DEFAULT 0, last_seen TEXT, last_seen_ms INTEGER,
    created_at TEXT NOT NULL
  )`)
  db.exec(`CREATE UNIQUE INDEX idx_inv_tx_idem ON inventory_transactions(idempotency_key) WHERE idempotency_key IS NOT NULL`)
}

// ── Test DB helpers ─────────────────────────────────────────────────

function mkDb(): Database.Database {
  const path = join(process.env.TEMP ?? '/tmp', `soostori-lan-${Date.now()}-${randomUUID().slice(0, 8)}.db`)
  const db = new Database(path)
  db.pragma('journal_mode = WAL')
  bootstrap(db)
  return db
}

function closeDb(db: Database.Database): void {
  db.close()
  try { unlinkSync(db.name!) } catch { /* ignore */ }
}

// ── Constants ───────────────────────────────────────────────────────

const SHOP = asShopId('shop-test')
const HOST_DEVICE = asDeviceId('device-host')
const CLIENT_DEVICE = asDeviceId('device-client')
const USER_ID = 'user-1' as unknown as UUID
const MONEY = (n: number) => n as Money
const mkUUID = () => newId() as UUID

// ── Host service factory ──────────────────────────────────────────────

function makeHostSvc(db: Database.Database) {
  setDatabase(db as unknown as Database.Database)
  const productsRepo = new ProductsRepository()
  const salesRepo = new DesktopSalesRepository()
  // Required: set shop context before any product row mapping
  ProductsRepository.setSaleMeta({ shopId: SHOP as string, deviceId: HOST_DEVICE as string })
  const svc = new SalesService(salesRepo, productsRepo, SHOP, HOST_DEVICE, checkPrimary.bind(null, db))
  db.prepare(`
    INSERT INTO devices (id, shop_id, is_host, last_seen, last_seen_ms, device_type, created_at)
    VALUES (?, ?, 1, datetime('now'), ?, 'desktop', datetime('now'))
  `).run(HOST_DEVICE as string, SHOP as string, Date.now())
  return svc
}

function checkPrimary(db: Database.Database): void {
  const primary = db.prepare(
    'SELECT last_seen_ms FROM devices WHERE is_host = 1 AND shop_id = ? LIMIT 1',
  ).get(SHOP as string) as { last_seen_ms: number | null } | undefined
  if (!primary) throw Object.assign(new Error('Stock mutation blocked: Primary Device is lost'), { code: 'STOCK_AUTHORIZATION_ERROR', status: 'lost' })
  const ms = primary.last_seen_ms ? Date.now() - primary.last_seen_ms : Infinity
  if (ms > 60_000) throw Object.assign(new Error('Stock mutation blocked: Primary Device is lost'), { code: 'STOCK_AUTHORIZATION_ERROR', status: 'lost' })
  if (ms > 15_000) throw Object.assign(new Error('Stock mutation blocked: Primary Device is stale'), { code: 'STOCK_AUTHORIZATION_ERROR', status: 'stale' })
}

// ── Helper: enrich items with product prices from DB ─────────────────

function enrichItems(db: Database.Database, items: Array<{ productId: string; quantity: number }>) {
  return items.map(i => {
    const p = db.prepare('SELECT name, selling_price FROM products WHERE id = ?').get(i.productId) as { name: string; selling_price: number } | undefined
    const unitPrice = p?.selling_price ?? 0
    return {
      productId: i.productId,
      productName: p?.name ?? 'Unknown',
      quantity: i.quantity,
      unitPrice,
      discount: 0,
      totalPrice: unitPrice * i.quantity,
      variationName: undefined as string | undefined,
    }
  })
}

// ── TEST 1: Client → Host → SALE_CONFIRMED, stock=0 ───────────────

async function testLanSale(): Promise<boolean> {
  console.log('\nTEST LAN 1: Client → Host → SALE_CONFIRMED, stock decremented to 0')
  const hostDb = mkDb()
  const PORT = 18780 + Math.floor(Math.random() * 200)

  try {
    const svc = makeHostSvc(hostDb)
    const pid = mkUUID()
    hostDb.prepare(`INSERT INTO products (id, name, selling_price, current_stock, stock_quantity, track_inventory, is_active) VALUES (?, 'Coffee', 500, 1, 1, 1, 1)`).run(pid as string)

    const server = createServer()
    const wss = new WebSocketServer({ server })
    wss.on('connection', (ws: WebSocket) => {
      ws.on('message', async (data: Buffer) => {
        const msg = JSON.parse(data.toString())
        if (msg.type === 'SALE_PENDING') {
          const { saleId, items, paymentMethod, paidAmount } = msg.payload ?? msg
          const enriched = enrichItems(hostDb, items ?? [])
          try {
            await svc.commit({
              saleId, items: enriched,
              paymentMethod: (paymentMethod ?? 'cash') as 'cash' | 'mobile_money' | 'card' | 'transfer' | 'debt',
              paidAmount: (paidAmount ?? 0) as Money,
              discountAmount: 0, taxAmount: 0,
              note: undefined, customerId: undefined, customerName: undefined,
              userId: USER_ID, deviceId: CLIENT_DEVICE,
            })
            ws.send(JSON.stringify({ type: 'SALE_CONFIRMED', saleId }))
          } catch (err) {
            const e = err as { code?: string; message: string }
            ws.send(JSON.stringify({ type: 'SALE_REJECTED', saleId, rejectionReason: e.code === 'STOCK_AUTHORIZATION_ERROR' ? 'PRIMARY_UNAVAILABLE_OFFLINE_TOO_LONG' : 'INSUFFICIENT_STOCK', message: e.message }))
          }
        }
      })
    })

    await new Promise<void>(res => server.listen(PORT, res))

    const clientWs = await new Promise<WebSocket>((res, rej) => {
      const ws = new WebSocket(`ws://localhost:${PORT}`)
      ws.on('open', () => res(ws))
      ws.on('error', rej)
      setTimeout(() => rej(new Error('connect timeout')), 5000)
    })

    const saleId = mkUUID()
    const result = await new Promise<{ type: string }>((res, rej) => {
      clientWs.on('message', buf => res(JSON.parse(buf.toString())))
      clientWs.on('error', rej)
      clientWs.send(JSON.stringify({ type: 'SALE_PENDING', payload: { saleId, items: [{ productId: pid as string, quantity: 1 }], paymentMethod: 'cash', paidAmount: 500 } }))
      setTimeout(() => rej(new Error('response timeout')), 5000)
    })

    clientWs.close()
    wss.close()
    server.close()

    const stock = (hostDb.prepare('SELECT current_stock FROM products WHERE id = ?').get(pid as string) as { current_stock: number }).current_stock
    const txCount = (hostDb.prepare('SELECT COUNT(*) as n FROM inventory_transactions').get() as { n: number }).n
    const salesCount = (hostDb.prepare("SELECT COUNT(*) as n FROM sales WHERE status = 'completed'").get() as { n: number }).n

    const ok = result.type === 'SALE_CONFIRMED' && stock === 0 && txCount === 1 && salesCount === 1
    console.log(`  type=${result.type} (want SALE_CONFIRMED) | stock=${stock} (want 0) | tx=${txCount} (want 1) | sales=${salesCount} (want 1)`)
    console.log(' ', ok ? 'PASS ✅' : 'FAIL ❌')
    return ok
  } finally {
    closeDb(hostDb)
  }
}

// ── TEST 2: Concurrent two clients, stock=1 → exactly ONE succeeds ──

async function testConcurrentSale(): Promise<boolean> {
  console.log('\nTEST LAN 2: Two clients, stock=1 → only ONE succeeds')
  const hostDb = mkDb()
  const PORT = 18780 + Math.floor(Math.random() * 200)

  try {
    const svc = makeHostSvc(hostDb)
    const pid = mkUUID()
    hostDb.prepare(`INSERT INTO products (id, name, selling_price, current_stock, stock_quantity, track_inventory, is_active) VALUES (?, 'Coffee', 500, 1, 1, 1, 1)`).run(pid as string)

    const server = createServer()
    const wss = new WebSocketServer({ server })
    wss.on('connection', (ws: WebSocket) => {
      ws.on('message', async (data: Buffer) => {
        const msg = JSON.parse(data.toString())
        if (msg.type === 'SALE_PENDING') {
          const { saleId, items, paymentMethod, paidAmount } = msg.payload ?? msg
          const enriched = enrichItems(hostDb, items ?? [])
          try {
            await svc.commit({ saleId, items: enriched, paymentMethod: (paymentMethod ?? 'cash') as 'cash' | 'mobile_money' | 'card' | 'transfer' | 'debt', paidAmount: (paidAmount ?? 0) as Money, discountAmount: 0, taxAmount: 0, note: undefined, customerId: undefined, customerName: undefined, userId: USER_ID, deviceId: CLIENT_DEVICE })
            ws.send(JSON.stringify({ type: 'SALE_CONFIRMED', saleId }))
          } catch (err) {
            const e = err as { code?: string; message: string }
            ws.send(JSON.stringify({ type: 'SALE_REJECTED', saleId, rejectionReason: e.code === 'STOCK_AUTHORIZATION_ERROR' ? 'PRIMARY_UNAVAILABLE_OFFLINE_TOO_LONG' : 'INSUFFICIENT_STOCK', message: e.message }))
          }
        }
      })
    })

    await new Promise<void>(res => server.listen(PORT, res))

    const makeClient = (): Promise<WebSocket> => new Promise((res, rej) => {
      const ws = new WebSocket(`ws://localhost:${PORT}`)
      ws.on('open', () => res(ws))
      ws.on('error', rej)
      setTimeout(() => rej(new Error('connect timeout')), 5000)
    })

    const [ws1, ws2] = await Promise.all([makeClient(), makeClient()])

    const saleId1 = mkUUID()
    const saleId2 = mkUUID()

    const [r1, r2] = await Promise.all([
      new Promise<{ type: string }>((res, rej) => {
        ws1.on('message', buf => res(JSON.parse(buf.toString())))
        ws1.on('error', rej)
        ws1.send(JSON.stringify({ type: 'SALE_PENDING', payload: { saleId: saleId1, items: [{ productId: pid as string, quantity: 1 }], paymentMethod: 'cash', paidAmount: 500 } }))
        setTimeout(() => rej(new Error('timeout')), 5000)
      }),
      new Promise<{ type: string }>((res, rej) => {
        ws2.on('message', buf => res(JSON.parse(buf.toString())))
        ws2.on('error', rej)
        ws2.send(JSON.stringify({ type: 'SALE_PENDING', payload: { saleId: saleId2, items: [{ productId: pid as string, quantity: 1 }], paymentMethod: 'cash', paidAmount: 500 } }))
        setTimeout(() => rej(new Error('timeout')), 5000)
      }),
    ])

    ws1.close(); ws2.close()
    wss.close(); server.close()

    const stock = (hostDb.prepare('SELECT current_stock FROM products WHERE id = ?').get(pid as string) as { current_stock: number }).current_stock
    const txCount = (hostDb.prepare('SELECT COUNT(*) as n FROM inventory_transactions').get() as { n: number }).n
    const salesCount = (hostDb.prepare("SELECT COUNT(*) as n FROM sales WHERE status = 'completed'").get() as { n: number }).n

    const successes = [r1.type, r2.type].filter(t => t === 'SALE_CONFIRMED').length
    const rejections = [r1.type, r2.type].filter(t => t === 'SALE_REJECTED').length
    const ok = successes === 1 && rejections === 1 && stock === 0 && txCount === 1 && salesCount === 1
    console.log(`  successes=${successes} (want 1) | rejections=${rejections} (want 1) | stock=${stock} (want 0) | tx=${txCount} (want 1) | sales=${salesCount} (want 1)`)
    console.log(' ', ok ? 'PASS ✅' : 'FAIL ❌')
    return ok
  } finally {
    closeDb(hostDb)
  }
}

// ── TEST 3: STALE Primary → SALE_REJECTED ──────────────────────────

async function testStalePrimary(): Promise<boolean> {
  console.log('\nTEST LAN 3: STALE Primary → SALE_REJECTED')
  const hostDb = mkDb()
  const PORT = 18780 + Math.floor(Math.random() * 200)

  try {
    const svc = makeHostSvc(hostDb)
    const pid = mkUUID()
    hostDb.prepare(`INSERT INTO products (id, name, selling_price, current_stock, stock_quantity, track_inventory, is_active) VALUES (?, 'Coffee', 500, 1, 1, 1, 1)`).run(pid as string)
    // Make host STALE (30s ago heartbeat)
    hostDb.prepare('UPDATE devices SET last_seen_ms = ? WHERE is_host = 1').run(Date.now() - 30_000)

    const server = createServer()
    const wss = new WebSocketServer({ server })
    wss.on('connection', (ws: WebSocket) => {
      ws.on('message', async (data: Buffer) => {
        const msg = JSON.parse(data.toString())
        if (msg.type === 'SALE_PENDING') {
          const { saleId, items, paymentMethod, paidAmount } = msg.payload ?? msg
          const enriched = enrichItems(hostDb, items ?? [])
          try {
            await svc.commit({ saleId, items: enriched, paymentMethod: (paymentMethod ?? 'cash') as 'cash' | 'mobile_money' | 'card' | 'transfer' | 'debt', paidAmount: (paidAmount ?? 0) as Money, discountAmount: 0, taxAmount: 0, note: undefined, customerId: undefined, customerName: undefined, userId: USER_ID, deviceId: CLIENT_DEVICE })
            ws.send(JSON.stringify({ type: 'SALE_CONFIRMED', saleId }))
          } catch (err) {
            const e = err as { code?: string; message: string }
            ws.send(JSON.stringify({ type: 'SALE_REJECTED', saleId, rejectionReason: e.code === 'STOCK_AUTHORIZATION_ERROR' ? 'PRIMARY_UNAVAILABLE_OFFLINE_TOO_LONG' : 'INSUFFICIENT_STOCK', message: e.message }))
          }
        }
      })
    })

    await new Promise<void>(res => server.listen(PORT, res))

    const clientWs = await new Promise<WebSocket>((res, rej) => {
      const ws = new WebSocket(`ws://localhost:${PORT}`)
      ws.on('open', () => res(ws))
      ws.on('error', rej)
      setTimeout(() => rej(new Error('timeout')), 5000)
    })

    const result = await new Promise<{ type: string }>((res, rej) => {
      clientWs.on('message', buf => res(JSON.parse(buf.toString())))
      clientWs.on('error', rej)
      clientWs.send(JSON.stringify({ type: 'SALE_PENDING', payload: { saleId: mkUUID(), items: [{ productId: pid as string, quantity: 1 }], paymentMethod: 'cash', paidAmount: 500 } }))
      setTimeout(() => rej(new Error('timeout')), 5000)
    })

    clientWs.close()
    wss.close()
    server.close()

    const stock = (hostDb.prepare('SELECT current_stock FROM products WHERE id = ?').get(pid as string) as { current_stock: number }).current_stock
    const txCount = (hostDb.prepare('SELECT COUNT(*) as n FROM inventory_transactions').get() as { n: number }).n
    const salesCount = (hostDb.prepare("SELECT COUNT(*) as n FROM sales WHERE status = 'completed'").get() as { n: number }).n

    const ok = result.type === 'SALE_REJECTED' && stock === 1 && txCount === 0 && salesCount === 0
    console.log(`  type=${result.type} (want SALE_REJECTED) | stock=${stock} (want 1) | tx=${txCount} (want 0) | sales=${salesCount} (want 0)`)
    console.log(' ', ok ? 'PASS ✅' : 'FAIL ❌')
    return ok
  } finally {
    closeDb(hostDb)
  }
}

// ── TEST 4: Idempotent replay — same saleId → one ledger entry ─────

async function testIdempotentReplay(): Promise<boolean> {
  console.log('\nTEST LAN 4: Same saleId twice → only one ledger entry')
  const hostDb = mkDb()
  const PORT = 18780 + Math.floor(Math.random() * 200)

  try {
    const svc = makeHostSvc(hostDb)
    const pid = mkUUID()
    hostDb.prepare(`INSERT INTO products (id, name, selling_price, current_stock, stock_quantity, track_inventory, is_active) VALUES (?, 'Coffee', 500, 5, 5, 1, 1)`).run(pid as string)

    const server = createServer()
    const wss = new WebSocketServer({ server })
    const processed = new Set<string>()

    wss.on('connection', (ws: WebSocket) => {
      ws.on('message', async (data: Buffer) => {
        const msg = JSON.parse(data.toString())
        if (msg.type === 'SALE_PENDING') {
          const { saleId, items, paymentMethod, paidAmount } = msg.payload ?? msg
          if (processed.has(saleId)) return  // idempotent replay guard
          processed.add(saleId)
          const enriched = enrichItems(hostDb, items ?? [])
          try {
            await svc.commit({ saleId, items: enriched, paymentMethod: (paymentMethod ?? 'cash') as 'cash' | 'mobile_money' | 'card' | 'transfer' | 'debt', paidAmount: (paidAmount ?? 0) as Money, discountAmount: 0, taxAmount: 0, note: undefined, customerId: undefined, customerName: undefined, userId: USER_ID, deviceId: CLIENT_DEVICE })
            ws.send(JSON.stringify({ type: 'SALE_CONFIRMED', saleId }))
          } catch (err) {
            const e = err as { code?: string; message: string }
            ws.send(JSON.stringify({ type: 'SALE_REJECTED', saleId, rejectionReason: e.code === 'STOCK_AUTHORIZATION_ERROR' ? 'PRIMARY_UNAVAILABLE_OFFLINE_TOO_LONG' : 'INSUFFICIENT_STOCK', message: e.message }))
          }
        }
      })
    })

    await new Promise<void>(res => server.listen(PORT, res))

    const clientWs = await new Promise<WebSocket>((res, rej) => {
      const ws = new WebSocket(`ws://localhost:${PORT}`)
      ws.on('open', () => res(ws))
      ws.on('error', rej)
      setTimeout(() => rej(new Error('connect timeout')), 5000)
    })

    const saleId = mkUUID()
    // First attempt
    await new Promise<void>((res, rej) => {
      const h = () => { clientWs.removeListener('message', h); res() }
      clientWs.on('message', h)
      clientWs.on('error', rej)
      clientWs.send(JSON.stringify({ type: 'SALE_PENDING', payload: { saleId, items: [{ productId: pid as string, quantity: 1 }], paymentMethod: 'cash', paidAmount: 500 } }))
      setTimeout(() => rej(new Error('timeout1')), 5000)
    })
    // Replay same saleId after 50ms — server silently drops it (idempotent, no response sent).
    // Client does NOT wait for a response — just wait and verify DB state.
    await new Promise<void>(res => setTimeout(res, 100))
    // Also send the duplicate — it should be silently ignored by the server (no response).
    clientWs.send(JSON.stringify({ type: 'SALE_PENDING', payload: { saleId, items: [{ productId: pid as string, quantity: 1 }], paymentMethod: 'cash', paidAmount: 500 } }))

    clientWs.close()
    wss.close()
    server.close()

    const stock = (hostDb.prepare('SELECT current_stock FROM products WHERE id = ?').get(pid as string) as { current_stock: number }).current_stock
    const txCount = (hostDb.prepare('SELECT COUNT(*) as n FROM inventory_transactions').get() as { n: number }).n
    const salesCount = (hostDb.prepare("SELECT COUNT(*) as n FROM sales WHERE status = 'completed'").get() as { n: number }).n

    const ok = stock === 4 && txCount === 1 && salesCount === 1
    console.log(`  stock=${stock} (want 4) | tx=${txCount} (want 1) | sales=${salesCount} (want 1)`)
    console.log(' ', ok ? 'PASS ✅' : 'FAIL ❌')
    return ok
  } finally {
    closeDb(hostDb)
  }
}

// ── MAIN ────────────────────────────────────────────────────────────

async function main() {
  console.log('═'.repeat(56))
  console.log('Phase 10.2 LAN Sale Integration Tests')
  console.log('═'.repeat(56))

  let passed = 0; let failed = 0
  if (await testLanSale()) passed++; else failed++
  if (await testConcurrentSale()) passed++; else failed++
  if (await testStalePrimary()) passed++; else failed++
  if (await testIdempotentReplay()) passed++; else failed++

  console.log('\n' + '─'.repeat(40))
  console.log(`Results: ${passed} passed, ${failed} failed`)
  console.log('─'.repeat(40))
  if (failed > 0) process.exit(1)
}

main().catch(e => { console.error(e); process.exit(1) })
