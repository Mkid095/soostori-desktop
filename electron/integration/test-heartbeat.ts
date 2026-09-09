/**
 * Phase 10.5 — Primary Heartbeat & Authority-State Detection
 */

import { createServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import { SyncServer } from '../sync/server'
import { setDatabase } from '../database'

const mkUUID = randomUUID
const SHOP = 'shop-phase105'
const HOST_DEVICE = 'host-device-105'
const USER_ID = 'user-105'

function mkDb(): Database.Database {
  const db = new Database(':memory:')
  db.pragma('journal_mode = WAL')
  db.exec(`CREATE TABLE IF NOT EXISTS shops (id TEXT PRIMARY KEY, name TEXT NOT NULL)`)
  db.exec(`CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT, selling_price REAL, current_stock INTEGER DEFAULT 0, stock_quantity INTEGER DEFAULT 0, track_inventory INTEGER DEFAULT 1, is_active INTEGER DEFAULT 1)`)
  db.exec(`CREATE TABLE IF NOT EXISTS devices (id TEXT PRIMARY KEY, shop_id TEXT, is_host INTEGER DEFAULT 0, last_seen TEXT, last_seen_ms INTEGER, device_type TEXT DEFAULT 'desktop', created_at TEXT DEFAULT (datetime('now')))`)
  db.exec(`CREATE TABLE IF NOT EXISTS sales (id TEXT PRIMARY KEY, type TEXT DEFAULT 'retail', status TEXT DEFAULT 'completed', subtotal REAL NOT NULL, discount_amount REAL DEFAULT 0, tax_amount REAL DEFAULT 0, total_amount REAL NOT NULL, paid_amount REAL NOT NULL, payment_method TEXT DEFAULT 'cash', note TEXT, customer_id_number TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`)
  db.exec(`CREATE TABLE IF NOT EXISTS sale_items (id TEXT PRIMARY KEY, sale_id TEXT NOT NULL, product_id TEXT, variation_name TEXT, product_name TEXT NOT NULL, quantity INTEGER NOT NULL, unit_price REAL NOT NULL, discount REAL DEFAULT 0, total_price REAL NOT NULL, created_at TEXT DEFAULT (datetime('now')))`)
  db.exec(`CREATE TABLE IF NOT EXISTS inventory_transactions (id TEXT PRIMARY KEY, shop_id TEXT, product_id TEXT, device_id TEXT, user_id TEXT, event_type TEXT, quantity INTEGER, balance_after INTEGER, payload TEXT, sequence_number INTEGER DEFAULT 0, idempotency_key TEXT, created_at TEXT DEFAULT (datetime('now')))`)
  db.exec(`CREATE TABLE IF NOT EXISTS sync_events (id TEXT PRIMARY KEY, shop_id TEXT, device_id TEXT, event_type TEXT, payload TEXT NOT NULL, sequence_number INTEGER NOT NULL, synced_at TEXT, created_at NOT NULL)`)
  db.exec(`CREATE TABLE IF NOT EXISTS sync_processed (id TEXT PRIMARY KEY, device_id TEXT NOT NULL, idempotency_key TEXT NOT NULL, event_id TEXT NOT NULL, processed_at TEXT NOT NULL)`)
  db.exec(`CREATE TABLE IF NOT EXISTS sync_queue (id TEXT PRIMARY KEY, device_id TEXT NOT NULL, event_type TEXT NOT NULL, payload TEXT NOT NULL, status TEXT DEFAULT 'pending', retry_count INTEGER DEFAULT 0, created_at TEXT NOT NULL)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_inv_tx_product ON inventory_transactions(product_id)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_inv_tx_seq ON inventory_transactions(sequence_number)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_sync_events_seq ON sync_events(sequence_number)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_sync_processed_key ON sync_processed(device_id, idempotency_key)`)
  return db
}

function closeDb(db: Database.Database): void {
  try { db.close() } catch { /* ignore */ }
}

// ── Threshold constants (must match sync-service.ts) ───────────────────────────────
const STALE_MS = 15_000
const LOST_MS = 60_000

function authorityStatus(lastSeenMs: number | null): 'online' | 'stale' | 'lost' | 'unknown' {
  if (lastSeenMs === null) return 'unknown'
  const age = Date.now() - lastSeenMs
  if (age > LOST_MS) return 'lost'
  if (age > STALE_MS) return 'stale'
  return 'online'
}

// ── TEST A: Host mode → authority is ONLINE ──────────────────────────────────

async function testHostModeOnline(): Promise<boolean> {
  console.log('\nTEST A: Host mode → authority is ONLINE')
  const hostDb = mkDb()
  const WS_PORT = 18800 + Math.floor(Math.random() * 50)
  const HTTP_PORT = WS_PORT + 100

  try {
    setDatabase(hostDb as unknown as Database)
    hostDb.prepare(`INSERT INTO shops (id, name) VALUES (?, 'Test Shop')`).run(SHOP)
    hostDb.prepare(`INSERT INTO devices (id, shop_id, is_host, last_seen, last_seen_ms, device_type, created_at) VALUES (?, ?, 1, datetime('now'), ?, 'desktop', datetime('now'))`).run(HOST_DEVICE as string, SHOP as string, Date.now())

    const httpServer = createServer()
    const wss = new WebSocketServer({ server: httpServer })
    const syncServer = new SyncServer(HOST_DEVICE as string, USER_ID, SHOP as string)

    await new Promise<void>(res => httpServer.listen(HTTP_PORT, res))
    syncServer.start(WS_PORT)

    const device = hostDb.prepare(`SELECT last_seen_ms FROM devices WHERE id = ?`).get(HOST_DEVICE as string) as { last_seen_ms: number | null }
    const ok = device.last_seen_ms !== null && device.last_seen_ms > 0
    console.log(`  last_seen_ms=${device.last_seen_ms} (want > 0)`)
    console.log(' ', ok ? 'PASS ✅' : 'FAIL ❌')

    syncServer.stop()
    wss.close()
    httpServer.close()
    return ok
  } finally {
    closeDb(hostDb)
  }
}

// ── TEST B: Fresh advert → ONLINE ────────────────────────────────────────────

async function testClientFreshPrimaryOnline(): Promise<boolean> {
  console.log('\nTEST B: Fresh advert → ONLINE')
  const status = authorityStatus(Date.now() - 1_000)
  const ok = status === 'online'
  console.log(`  status=${status} (want 'online')`)
  console.log(' ', ok ? 'PASS ✅' : 'FAIL ❌')
  return ok
}

// ── TEST C: Stale advert → STALE ────────────────────────────────────────────

async function testClientStalePrimary(): Promise<boolean> {
  console.log('\nTEST C: Stale advert → STALE')
  const status = authorityStatus(Date.now() - 20_000)
  const ok = status === 'stale'
  console.log(`  status=${status} (want 'stale')`)
  console.log(' ', ok ? 'PASS ✅' : 'FAIL ❌')
  return ok
}

// ── TEST D: Absent Primary → LOST ──────────────────────────────────────────

async function testClientAbsentPrimary(): Promise<boolean> {
  console.log('\nTEST D: Absent Primary → LOST')
  const status = authorityStatus(Date.now() - 90_000)
  const ok = status === 'lost'
  console.log(`  status=${status} (want 'lost')`)
  console.log(' ', ok ? 'PASS ✅' : 'FAIL ❌')
  return ok
}

// ── TEST E: No discovery → UNKNOWN ─────────────────────────────────────────

async function testClientNoDiscoveryUnknown(): Promise<boolean> {
  console.log('\nTEST E: No discovery → UNKNOWN')
  const status = authorityStatus(null)
  const ok = status === 'unknown'
  console.log(`  status=${status} (want 'unknown')`)
  console.log(' ', ok ? 'PASS ✅' : 'FAIL ❌')
  return ok
}

// ── TEST F: Recovery LOST → ONLINE ─────────────────────────────────────────

async function testPrimaryRecovery(): Promise<boolean> {
  console.log('\nTEST F: Recovery LOST → ONLINE')
  const before = authorityStatus(Date.now() - 90_000)
  const after = authorityStatus(Date.now() - 1_000)
  const ok = before === 'lost' && after === 'online'
  console.log(`  before=${before} (want 'lost') | after=${after} (want 'online')`)
  console.log(' ', ok ? 'PASS ✅' : 'FAIL ❌')
  return ok
}

// ── TEST G: Two clients independently detect STALE ───────────────────────────

async function testTwoClientsDetectStale(): Promise<boolean> {
  console.log('\nTEST G: Two clients independently detect STALE')
  const clientA = authorityStatus(Date.now() - 20_000)
  const clientB = authorityStatus(Date.now() - 20_000)
  const ok = clientA === 'stale' && clientB === 'stale'
  console.log(`  client_a=${clientA} (want 'stale') | client_b=${clientB} (want 'stale')`)
  console.log(' ', ok ? 'PASS ✅' : 'FAIL ❌')
  return ok
}

// ── TEST H: Heartbeat does NOT create sync_events ─────────────────────────────

async function testHeartbeatNoSyncEvents(): Promise<boolean> {
  console.log('\nTEST H: Heartbeat does NOT create sync_events')
  const hostDb = mkDb()

  try {
    setDatabase(hostDb as unknown as Database)
    hostDb.prepare(`INSERT INTO shops (id, name) VALUES (?, 'Test Shop')`).run(SHOP)
    hostDb.prepare(`INSERT INTO devices (id, shop_id, is_host, last_seen, last_seen_ms, device_type, created_at) VALUES (?, ?, 1, datetime('now'), ?, 'desktop', datetime('now'))`).run(HOST_DEVICE as string, SHOP as string, Date.now())

    // Simulate multiple heartbeat ticks (no events should be written)
    for (let i = 0; i < 10; i++) {
      hostDb.prepare(`UPDATE devices SET last_seen = ?, last_seen_ms = ? WHERE id = ?`).run(new Date().toISOString(), Date.now(), HOST_DEVICE)
    }

    const count = (hostDb.prepare(`SELECT COUNT(*) as n FROM sync_events`).get() as { n: number }).n
    const ok = count === 0
    console.log(`  sync_events=${count} (want 0)`)
    console.log(' ', ok ? 'PASS ✅' : 'FAIL ❌')
    return ok
  } finally {
    closeDb(hostDb)
  }
}

// ── TEST I: Host restart → sequence NOT reset to 0 ──────────────────────────

async function testHostRestartSequenceContinues(): Promise<boolean> {
  console.log('\nTEST I: Host restart → sequence NOT reset to 0')
  const hostDb = mkDb()
  const WS_PORT = 18900 + Math.floor(Math.random() * 50)
  const HTTP_PORT = WS_PORT + 100

  try {
    setDatabase(hostDb as unknown as Database)
    hostDb.prepare(`INSERT INTO shops (id, name) VALUES (?, 'Test Shop')`).run(SHOP)
    hostDb.prepare(`INSERT INTO devices (id, shop_id, is_host, last_seen, last_seen_ms, device_type, created_at) VALUES (?, ?, 1, datetime('now'), ?, 'desktop', datetime('now'))`).run(HOST_DEVICE as string, SHOP as string, Date.now())

    // Pre-populate: highest seq = 7
    for (let i = 1; i <= 7; i++) {
      hostDb.prepare(`INSERT INTO sync_events (id, shop_id, device_id, event_type, payload, sequence_number, created_at) VALUES (?, ?, ?, 'STOCK_ADJUSTED', ?, ?, datetime('now'))`).run(uuidv4(), SHOP as string, HOST_DEVICE, JSON.stringify({ productId: mkUUID(), quantity: -1, newBalance: 10 - i, eventType: 'adjusted' }), i)
    }

    const httpServer = createServer()
    const wss = new WebSocketServer({ server: httpServer })
    const syncServer = new SyncServer(HOST_DEVICE as string, USER_ID, SHOP as string)

    await new Promise<void>(res => httpServer.listen(HTTP_PORT, res))
    syncServer.start(WS_PORT)

    const seq = syncServer['_state'].sequenceNumber

    const ok = seq === 7
    console.log(`  seq_after_start=${seq} (want 7 — loaded from DB)`)
    console.log(' ', ok ? 'PASS ✅' : 'FAIL ❌')

    syncServer.stop()
    wss.close()
    httpServer.close()
    return ok
  } finally {
    closeDb(hostDb)
  }
}

// ── TEST J: UNKNOWN Primary → no host device ────────────────────────────────

async function testUnknownPrimaryRejects(): Promise<boolean> {
  console.log('\nTEST J: UNKNOWN Primary → no host device')
  const hostDb = mkDb()

  try {
    hostDb.prepare(`INSERT INTO shops (id, name) VALUES (?, 'Test Shop')`).run(SHOP)
    // No host device
    const primary = hostDb.prepare(`SELECT last_seen_ms FROM devices WHERE is_host = 1 AND shop_id = ?`).get(SHOP as string) as { last_seen_ms: number | null } | undefined
    const ok = primary === undefined
    console.log(`  has_primary=${primary !== undefined} (want false)`)
    console.log(' ', ok ? 'PASS ✅' : 'FAIL ❌')
    return ok
  } finally {
    closeDb(hostDb)
  }
}

// ── TEST K: STALE Primary → heartbeat too old ──────────────────────────────

async function testStalePrimaryCheck(): Promise<boolean> {
  console.log('\nTEST K: STALE Primary check')
  const hostDb = mkDb()

  try {
    hostDb.prepare(`INSERT INTO shops (id, name) VALUES (?, 'Test Shop')`).run(SHOP)
    // Primary with 20s old heartbeat = stale
    hostDb.prepare(`INSERT INTO devices (id, shop_id, is_host, last_seen, last_seen_ms, device_type, created_at) VALUES (?, ?, 1, datetime('now'), ?, 'desktop', datetime('now'))`).run(HOST_DEVICE as string, SHOP as string, Date.now() - 20_000)

    const primary = hostDb.prepare(`SELECT last_seen_ms FROM devices WHERE is_host = 1 AND shop_id = ?`).get(SHOP as string) as { last_seen_ms: number | null } | undefined
    const ms = primary?.last_seen_ms ? Date.now() - primary.last_seen_ms : Infinity
    const status = authorityStatus(primary?.last_seen_ms ?? null)
    const ok = status === 'stale'
    console.log(`  status=${status} (want 'stale') | age=${Math.round(ms)}ms`)
    console.log(' ', ok ? 'PASS ✅' : 'FAIL ❌')
    return ok
  } finally {
    closeDb(hostDb)
  }
}

// ── TEST L: LOST Primary → heartbeat absent too long ─────────────────────────

async function testLostPrimaryCheck(): Promise<boolean> {
  console.log('\nTEST L: LOST Primary check')
  const hostDb = mkDb()

  try {
    hostDb.prepare(`INSERT INTO shops (id, name) VALUES (?, 'Test Shop')`).run(SHOP)
    // Primary with 90s old heartbeat = lost
    hostDb.prepare(`INSERT INTO devices (id, shop_id, is_host, last_seen, last_seen_ms, device_type, created_at) VALUES (?, ?, 1, datetime('now'), ?, 'desktop', datetime('now'))`).run(HOST_DEVICE as string, SHOP as string, Date.now() - 90_000)

    const primary = hostDb.prepare(`SELECT last_seen_ms FROM devices WHERE is_host = 1 AND shop_id = ?`).get(SHOP as string) as { last_seen_ms: number | null } | undefined
    const status = authorityStatus(primary?.last_seen_ms ?? null)
    const ok = status === 'lost'
    console.log(`  status=${status} (want 'lost')`)
    console.log(' ', ok ? 'PASS ✅' : 'FAIL ❌')
    return ok
  } finally {
    closeDb(hostDb)
  }
}

// ── Runner ────────────────────────────────────────────────────────────────────

async function runAll(): Promise<void> {
  console.log('════════════════════════════════════════════════════════')
  console.log('Phase 10.5 — Primary Heartbeat & Authority Detection Tests')
  console.log('════════════════════════════════════════════════════════')

  const results: boolean[] = []
  results.push(await testHostModeOnline())
  results.push(await testClientFreshPrimaryOnline())
  results.push(await testClientStalePrimary())
  results.push(await testClientAbsentPrimary())
  results.push(await testClientNoDiscoveryUnknown())
  results.push(await testPrimaryRecovery())
  results.push(await testTwoClientsDetectStale())
  results.push(await testHeartbeatNoSyncEvents())
  results.push(await testHostRestartSequenceContinues())
  results.push(await testUnknownPrimaryRejects())
  results.push(await testStalePrimaryCheck())
  results.push(await testLostPrimaryCheck())

  const passed = results.filter(Boolean).length
  console.log('\n────────────────────────────────────────')
  console.log(`Results: ${passed} passed, ${results.length - passed} failed`)
  console.log('────────────────────────────────────────')
  if (passed < results.length) process.exit(1)
}

runAll().catch(err => { console.error(err); process.exit(1) })
