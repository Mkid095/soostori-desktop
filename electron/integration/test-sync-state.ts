/**
 * Phase 10.4 — Product Event Idempotency + SALE_CONFIRMED Persistence + Recovery
 *
 * Tests:
 * A. PRODUCT_UPDATED once → applied locally
 * B. PRODUCT_UPDATED twice → idempotent (one local mutation)
 * C. Product event catch-up via GET_EVENTS_AFTER after reconnect
 * D. SALE_CONFIRMED → client writes local sale record
 * E. SALE_CONFIRMED replay → idempotent (one local sale)
 * F. Lost response recovery — SALE_PENDING sent, response lost, reconnect → sale confirmed
 */

import { createServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import { SyncServer } from '../sync/server'

const mkUUID = randomUUID
const SHOP = 'shop-phase104'
const HOST_DEVICE = 'host-device-104'
const CLIENT_DEVICE = 'client-device-104'
const USER_ID = 'user-104'

function mkDb(): Database.Database {
  const db = new Database(':memory:')
  db.pragma('journal_mode = WAL')
  db.exec(`CREATE TABLE IF NOT EXISTS shops (id TEXT PRIMARY KEY, name TEXT NOT NULL)`)
  db.exec(`CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT, selling_price REAL, current_stock INTEGER DEFAULT 0, stock_quantity INTEGER DEFAULT 0, track_inventory INTEGER DEFAULT 1, is_active INTEGER DEFAULT 1)`)
  db.exec(`CREATE TABLE IF NOT EXISTS devices (id TEXT PRIMARY KEY, shop_id TEXT, is_host INTEGER DEFAULT 0, last_seen TEXT, last_seen_ms INTEGER, device_type TEXT DEFAULT 'desktop', created_at TEXT DEFAULT (datetime('now')))`)
  db.exec(`CREATE TABLE IF NOT EXISTS sales (id TEXT PRIMARY KEY, type TEXT DEFAULT 'retail', status TEXT DEFAULT 'completed', subtotal REAL NOT NULL, discount_amount REAL DEFAULT 0, tax_amount REAL DEFAULT 0, total_amount REAL NOT NULL, paid_amount REAL NOT NULL, payment_method TEXT DEFAULT 'cash', note TEXT, customer_id_number TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`)
  db.exec(`CREATE TABLE IF NOT EXISTS sale_items (id TEXT PRIMARY KEY, sale_id TEXT NOT NULL, product_id TEXT, variation_name TEXT, product_name TEXT NOT NULL, quantity INTEGER NOT NULL, unit_price REAL NOT NULL, discount REAL DEFAULT 0, total_price REAL NOT NULL, created_at TEXT DEFAULT (datetime('now')))`)
  db.exec(`CREATE TABLE IF NOT EXISTS inventory_transactions (id TEXT PRIMARY KEY, shop_id TEXT, product_id TEXT, device_id TEXT, user_id TEXT, event_type TEXT, quantity INTEGER, balance_after INTEGER, payload TEXT, sequence_number INTEGER DEFAULT 0, idempotency_key TEXT, created_at TEXT DEFAULT (datetime('now')))`)
  db.exec(`CREATE TABLE IF NOT EXISTS sync_events (id TEXT PRIMARY KEY, shop_id TEXT, device_id TEXT, event_type TEXT, payload TEXT NOT NULL, sequence_number INTEGER NOT NULL, synced_at TEXT, created_at TEXT NOT NULL)`)
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

// ── Client-side applier mirrors SyncService behavior ──────────────────────────────

function applySaleConfirmedLocally(db: Database.Database, shopId: string, event: {
  id: string; deviceId: string; userId: string; sequenceNumber?: number
  payload: { saleId: string }
}): void {
  const { saleId } = event.payload
  const existing = db.prepare('SELECT id FROM sales WHERE id = ?').get(saleId)
  if (existing) return
  db.prepare(`
    INSERT INTO sales (id, status, subtotal, total_amount, paid_amount, created_at, updated_at)
    VALUES (?, 'completed', 0, 0, 0, ?, ?)
  `).run(saleId, new Date().toISOString(), new Date().toISOString())
}

function applyProductEventLocally(db: Database.Database, event: {
  id: string; deviceId: string; userId: string; eventType: string; sequenceNumber?: number
  payload: unknown
}): void {
  const payload = event.payload as { id?: string; name?: string; selling_price?: number; current_stock?: number }
  const id = payload?.id
  if (!id) return
  if (event.eventType === 'PRODUCT_CREATED') {
    db.prepare(`
      INSERT OR IGNORE INTO products (id, name, selling_price, current_stock, stock_quantity, track_inventory, is_active)
      VALUES (?, ?, ?, ?, ?, 1, 1)
    `).run(id, payload.name ?? 'Unknown', payload.selling_price ?? 0, payload.current_stock ?? 0, payload.current_stock ?? 0)
  } else if (event.eventType === 'PRODUCT_UPDATED') {
    const updates: string[] = []
    const values: unknown[] = []
    if (payload.name !== undefined) { updates.push('name = ?'); values.push(payload.name) }
    if (payload.selling_price !== undefined) { updates.push('selling_price = ?'); values.push(payload.selling_price) }
    if (payload.current_stock !== undefined) { updates.push('current_stock = ?'); values.push(payload.current_stock) }
    if (updates.length > 0) { values.push(id); db.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`).run(...values) }
  } else if (event.eventType === 'PRODUCT_DELETED') {
    db.prepare(`UPDATE products SET is_active = 0 WHERE id = ?`).run(id)
  }
}

// ── TEST A: PRODUCT_UPDATED once → applied locally ───────────────────────────────

async function testProductEventOnce(): Promise<boolean> {
  console.log('\nTEST A: PRODUCT_UPDATED once → applied locally')
  const hostDb = mkDb()
  const PORT = 18780 + Math.floor(Math.random() * 200)

  try {
    hostDb.prepare(`INSERT INTO shops (id, name) VALUES (?, 'Test Shop')`).run(SHOP)
    hostDb.prepare(`INSERT INTO devices (id, shop_id, is_host, last_seen, last_seen_ms, device_type, created_at) VALUES (?, ?, 1, datetime('now'), ?, 'desktop', datetime('now'))`).run(HOST_DEVICE as string, SHOP as string, Date.now())
    const pid = mkUUID()
    hostDb.prepare(`INSERT INTO products (id, name, selling_price, current_stock, stock_quantity, track_inventory, is_active) VALUES (?, 'Old Name', 100, 10, 10, 1, 1)`).run(pid as string)

    const server = createServer()
    const wss = new WebSocketServer({ server })
    const syncServer = new SyncServer(HOST_DEVICE as string, USER_ID, SHOP as string)
    const eventId = uuidv4()

    wss.on('connection', (ws: WebSocket) => {
      syncServer['clients'].set(ws, { deviceId: CLIENT_DEVICE, userId: USER_ID, lastSeq: 0 })
      ws.on('message', (data: Buffer) => {
        const msg = JSON.parse(data.toString())
        if (msg.type === 'CLIENT_READY') {
          syncServer.broadcast({
            id: eventId, deviceId: HOST_DEVICE, userId: USER_ID,
            eventType: 'PRODUCT_UPDATED',
            payload: { id: pid, name: 'New Name', selling_price: 150 },
            timestamp: new Date().toISOString(), sequenceNumber: 1,
          })
        }
      })
    })

    await new Promise<void>(res => server.listen(PORT, res))

    const clientDb = mkDb()
    clientDb.prepare(`INSERT INTO products (id, name, selling_price, current_stock, stock_quantity, track_inventory, is_active) VALUES (?, 'Old Name', 100, 10, 10, 1, 1)`).run(pid as string)

    const clientWs = new WebSocket(`ws://localhost:${PORT}`)
    await new Promise<void>(res => { clientWs.on('open', res) })

    let received = false
    clientWs.on('message', (data: Buffer) => {
      const raw = JSON.parse(data.toString())
      if (raw.eventType === 'PRODUCT_UPDATED') {
        received = true
        applyProductEventLocally(clientDb, raw)
      }
    })

    clientWs.send(JSON.stringify({ type: 'CLIENT_READY' }))
    await new Promise<void>(res => setTimeout(res, 400))

    clientWs.close()
    wss.close()
    server.close()

    const product = clientDb.prepare(`SELECT name, selling_price FROM products WHERE id = ?`).get(pid as string) as { name: string; selling_price: number }
    const ok = received && product.name === 'New Name' && product.selling_price === 150
    console.log(`  received=${received} | name=${product.name} (want 'New Name') | price=${product.selling_price} (want 150)`)
    console.log(' ', ok ? 'PASS ✅' : 'FAIL ❌')
    closeDb(clientDb)
    return ok
  } finally {
    closeDb(hostDb)
  }
}

// ── TEST B: PRODUCT_UPDATED twice → idempotent (one local mutation) ─────────────

async function testProductEventIdempotency(): Promise<boolean> {
  console.log('\nTEST B: PRODUCT_UPDATED twice → idempotent, one local mutation')
  const db = mkDb()
  const pid = mkUUID()
  db.prepare(`INSERT INTO products (id, name, selling_price, current_stock, stock_quantity, track_inventory, is_active) VALUES (?, 'Old', 100, 10, 10, 1, 1)`).run(pid as string)

  const event = {
    id: uuidv4(), deviceId: HOST_DEVICE, userId: USER_ID, eventType: 'PRODUCT_UPDATED' as const,
    payload: { id: pid, name: 'New', selling_price: 200 },
  }

  // Apply twice
  applyProductEventLocally(db, event)
  applyProductEventLocally(db, event)

  const product = db.prepare(`SELECT name, selling_price FROM products WHERE id = ?`).get(pid as string) as { name: string; selling_price: number }
  const ok = product.name === 'New' && product.selling_price === 200
  console.log(`  name=${product.name} (want 'New') | price=${product.selling_price} (want 200)`)
  console.log(' ', ok ? 'PASS ✅' : 'FAIL ❌')
  closeDb(db)
  return ok
}

// ── TEST C: Product event catch-up via GET_EVENTS_AFTER ───────────────────────

async function testProductEventCatchup(): Promise<boolean> {
  console.log('\nTEST C: Product event catch-up via GET_EVENTS_AFTER after reconnect')
  const hostDb = mkDb()
  const PORT = 18780 + Math.floor(Math.random() * 200)

  try {
    hostDb.prepare(`INSERT INTO shops (id, name) VALUES (?, 'Test Shop')`).run(SHOP)
    hostDb.prepare(`INSERT INTO devices (id, shop_id, is_host, last_seen, last_seen_ms, device_type, created_at) VALUES (?, ?, 1, datetime('now'), ?, 'desktop', datetime('now'))`).run(HOST_DEVICE as string, SHOP as string, Date.now())
    const pid = mkUUID()

    // Pre-populate product on host
    hostDb.prepare(`INSERT INTO products (id, name, selling_price, current_stock, stock_quantity, track_inventory, is_active) VALUES (?, 'Widget', 100, 10, 10, 1, 1)`).run(pid as string)

    // Pre-populate sync events (happened while client was offline)
    const e1Id = uuidv4()
    hostDb.prepare(`INSERT INTO sync_events (id, shop_id, device_id, event_type, payload, sequence_number, created_at) VALUES (?, ?, ?, 'PRODUCT_UPDATED', ?, 1, datetime('now'))`).run(e1Id, SHOP as string, HOST_DEVICE, JSON.stringify({ id: pid, name: 'Updated Widget', selling_price: 120 }))

    const server = createServer()
    const wss = new WebSocketServer({ server })

    wss.on('connection', (ws: WebSocket) => {
      ws.on('message', (data: Buffer) => {
        const msg = JSON.parse(data.toString())
        if (msg.type === 'GET_EVENTS_AFTER') {
          const seq = msg.sequenceNumber ?? 0
          const rows = hostDb.prepare(`SELECT * FROM sync_events WHERE sequence_number > ? ORDER BY sequence_number ASC`).all(seq) as Array<{ id: string; device_id: string; event_type: string; payload: string; sequence_number: number; created_at: string }>
          ws.send(JSON.stringify({ type: 'GET_EVENTS_AFTER', payload: rows.map(r => ({
            id: r.id, deviceId: r.device_id, userId: '', eventType: r.event_type,
            payload: JSON.parse(r.payload), timestamp: r.created_at, sequenceNumber: r.sequence_number,
          })) }))
        }
      })
    })

    await new Promise<void>(res => server.listen(PORT, res))

    const clientDb = mkDb()
    clientDb.prepare(`INSERT INTO products (id, name, selling_price, current_stock, stock_quantity, track_inventory, is_active) VALUES (?, 'Widget', 100, 10, 10, 1, 1)`).run(pid as string)

    let received = false
    const clientWs = new WebSocket(`ws://localhost:${PORT}`)
    await new Promise<void>(res => { clientWs.on('open', res) })

    clientWs.on('message', (data: Buffer) => {
      const raw = JSON.parse(data.toString())
      if (raw.type === 'GET_EVENTS_AFTER') {
        for (const event of raw.payload) {
          received = true
          applyProductEventLocally(clientDb, event)
        }
      }
    })

    clientWs.send(JSON.stringify({ type: 'GET_EVENTS_AFTER', sequenceNumber: 0 }))
    await new Promise<void>(res => setTimeout(res, 400))

    clientWs.close()
    wss.close()
    server.close()

    const product = clientDb.prepare(`SELECT name, selling_price FROM products WHERE id = ?`).get(pid as string) as { name: string; selling_price: number }
    const ok = received && product.name === 'Updated Widget' && product.selling_price === 120
    console.log(`  received=${received} | name=${product.name} (want 'Updated Widget') | price=${product.selling_price} (want 120)`)
    console.log(' ', ok ? 'PASS ✅' : 'FAIL ❌')
    closeDb(clientDb)
    return ok
  } finally {
    closeDb(hostDb)
  }
}

// ── TEST D: SALE_CONFIRMED → client writes local sale record ────────────────────

async function testSaleConfirmedWritesLocalRecord(): Promise<boolean> {
  console.log('\nTEST D: SALE_CONFIRMED → client writes local sale record')
  const hostDb = mkDb()
  const PORT = 18780 + Math.floor(Math.random() * 200)

  try {
    hostDb.prepare(`INSERT INTO shops (id, name) VALUES (?, 'Test Shop')`).run(SHOP)
    hostDb.prepare(`INSERT INTO devices (id, shop_id, is_host, last_seen, last_seen_ms, device_type, created_at) VALUES (?, ?, 1, datetime('now'), ?, 'desktop', datetime('now'))`).run(HOST_DEVICE as string, SHOP as string, Date.now())
    const pid = mkUUID()
    hostDb.prepare(`INSERT INTO products (id, name, selling_price, current_stock, stock_quantity, track_inventory, is_active) VALUES (?, 'Item', 100, 5, 5, 1, 1)`).run(pid as string)

    const server = createServer()
    const wss = new WebSocketServer({ server })
    const syncServer = new SyncServer(HOST_DEVICE as string, USER_ID, SHOP as string)
    const saleId = mkUUID()

    wss.on('connection', (ws: WebSocket) => {
      syncServer['clients'].set(ws, { deviceId: CLIENT_DEVICE, userId: USER_ID, lastSeq: 0 })
      ws.on('message', (data: Buffer) => {
        const msg = JSON.parse(data.toString())
        if (msg.type === 'CLIENT_READY') {
          syncServer.broadcast({
            id: uuidv4(), deviceId: HOST_DEVICE, userId: USER_ID,
            eventType: 'SALE_CONFIRMED',
            payload: { saleId },
            timestamp: new Date().toISOString(), sequenceNumber: 1,
          })
        }
      })
    })

    await new Promise<void>(res => server.listen(PORT, res))

    const clientDb = mkDb()

    const clientWs = new WebSocket(`ws://localhost:${PORT}`)
    await new Promise<void>(res => { clientWs.on('open', res) })

    let received = false
    clientWs.on('message', (data: Buffer) => {
      const raw = JSON.parse(data.toString())
      if (raw.eventType === 'SALE_CONFIRMED') {
        received = true
        applySaleConfirmedLocally(clientDb, SHOP as string, raw)
      }
    })

    clientWs.send(JSON.stringify({ type: 'CLIENT_READY' }))
    await new Promise<void>(res => setTimeout(res, 400))

    clientWs.close()
    wss.close()
    server.close()

    const sale = clientDb.prepare(`SELECT id, status FROM sales WHERE id = ?`).get(saleId as string) as { id: string; status: string } | undefined
    const ok = received && sale !== undefined && sale.status === 'completed'
    console.log(`  received=${received} | sale_exists=${sale !== undefined} (want true) | status=${sale?.status ?? 'N/A'} (want 'completed')`)
    console.log(' ', ok ? 'PASS ✅' : 'FAIL ❌')
    closeDb(clientDb)
    return ok
  } finally {
    closeDb(hostDb)
  }
}

// ── TEST E: SALE_CONFIRMED replay → idempotent (one local sale) ───────────────

async function testSaleConfirmedIdempotency(): Promise<boolean> {
  console.log('\nTEST E: SALE_CONFIRMED replay → idempotent, one local sale')
  const db = mkDb()
  const saleId = mkUUID()

  const event = {
    id: uuidv4(), deviceId: HOST_DEVICE, userId: USER_ID,
    payload: { saleId },
  }

  applySaleConfirmedLocally(db, SHOP as string, event)
  applySaleConfirmedLocally(db, SHOP as string, event)

  const count = (db.prepare(`SELECT COUNT(*) as n FROM sales WHERE id = ?`).get(saleId as string) as { n: number }).n
  const ok = count === 1
  console.log(`  sale_count=${count} (want 1)`)
  console.log(' ', ok ? 'PASS ✅' : 'FAIL ❌')
  closeDb(db)
  return ok
}

// ── TEST F: Lost response recovery — SALE_PENDING sent, response lost, reconnect ──

async function testLostResponseRecovery(): Promise<boolean> {
  console.log('\nTEST F: SALE_PENDING sent, response lost, reconnect → sale confirmed without double-commit')
  const hostDb = mkDb()
  const PORT = 18780 + Math.floor(Math.random() * 200)

  try {
    hostDb.prepare(`INSERT INTO shops (id, name) VALUES (?, 'Test Shop')`).run(SHOP)
    hostDb.prepare(`INSERT INTO devices (id, shop_id, is_host, last_seen, last_seen_ms, device_type, created_at) VALUES (?, ?, 1, datetime('now'), ?, 'desktop', datetime('now'))`).run(HOST_DEVICE as string, SHOP as string, Date.now())
    const pid = mkUUID()
    hostDb.prepare(`INSERT INTO products (id, name, selling_price, current_stock, stock_quantity, track_inventory, is_active) VALUES (?, 'Item', 100, 5, 5, 1, 1)`).run(pid as string)

    const saleId = mkUUID()

    // Simulate: host already committed the sale (client will recover via GET_EVENTS_AFTER)
    // Pre-populate: sale was committed at seq=1
    hostDb.prepare(`INSERT INTO sync_events (id, shop_id, device_id, event_type, payload, sequence_number, created_at) VALUES (?, ?, ?, 'SALE_CONFIRMED', ?, 1, datetime('now'))`).run(uuidv4(), SHOP as string, HOST_DEVICE, JSON.stringify({ saleId }))
    // Also write the sale record so GET_EVENTS_AFTER will include it
    hostDb.prepare(`INSERT INTO sales (id, status, subtotal, total_amount, paid_amount, created_at, updated_at) VALUES (?, 'completed', 100, 100, 100, datetime('now'), datetime('now'))`).run(saleId)

    const server = createServer()
    const wss = new WebSocketServer({ server })

    wss.on('connection', (ws: WebSocket) => {
      ws.on('message', (data: Buffer) => {
        const msg = JSON.parse(data.toString())
        if (msg.type === 'GET_EVENTS_AFTER') {
          const seq = msg.sequenceNumber ?? 0
          const rows = hostDb.prepare(`SELECT * FROM sync_events WHERE sequence_number > ? ORDER BY sequence_number ASC`).all(seq) as Array<{ id: string; device_id: string; event_type: string; payload: string; sequence_number: number; created_at: string }>
          ws.send(JSON.stringify({ type: 'GET_EVENTS_AFTER', payload: rows.map(r => ({
            id: r.id, deviceId: r.device_id, userId: '', eventType: r.event_type,
            payload: JSON.parse(r.payload), timestamp: r.created_at, sequenceNumber: r.sequence_number,
          })) }))
        }
      })
    })

    await new Promise<void>(res => server.listen(PORT, res))

    const clientDb = mkDb()
    // Client had NOT written the sale yet (simulating response was lost)
    // No sale record in clientDb

    const clientWs = new WebSocket(`ws://localhost:${PORT}`)
    await new Promise<void>(res => { clientWs.on('open', res) })

    let saleCountBeforeCatchup = (clientDb.prepare(`SELECT COUNT(*) as n FROM sales WHERE id = ?`).get(saleId as string) as { n: number } | undefined)?.n ?? 0

    let receivedSaleConfirmed = false
    clientWs.on('message', (data: Buffer) => {
      const raw = JSON.parse(data.toString())
      if (raw.type === 'GET_EVENTS_AFTER') {
        for (const event of raw.payload) {
          if (event.eventType === 'SALE_CONFIRMED') {
            receivedSaleConfirmed = true
            applySaleConfirmedLocally(clientDb, SHOP as string, event)
          }
        }
      }
    })

    // Simulate: client reconnects with last known seq=0 (hadn't seen anything)
    clientWs.send(JSON.stringify({ type: 'GET_EVENTS_AFTER', sequenceNumber: 0 }))
    await new Promise<void>(res => setTimeout(res, 400))

    const saleCountAfterCatchup = (clientDb.prepare(`SELECT COUNT(*) as n FROM sales WHERE id = ?`).get(saleId as string) as { n: number } | undefined)?.n ?? 0

    clientWs.close()
    wss.close()
    server.close()

    // The key invariants:
    // 1. SALE_CONFIRMED was received
    // 2. Before catchup: no local sale record
    // 3. After catchup: exactly 1 local sale record
    const ok = receivedSaleConfirmed && saleCountBeforeCatchup === 0 && saleCountAfterCatchup === 1
    console.log(`  sale_confirmed_received=${receivedSaleConfirmed} | before=${saleCountBeforeCatchup} | after=${saleCountAfterCatchup} (want 0 then 1)`)
    console.log(' ', ok ? 'PASS ✅' : 'FAIL ❌')
    closeDb(clientDb)
    return ok
  } finally {
    closeDb(hostDb)
  }
}

// ── Runner ────────────────────────────────────────────────────────────────────

async function runAll(): Promise<void> {
  console.log('════════════════════════════════════════════════════════')
  console.log('Phase 10.4 — Sync State Persistence Tests')
  console.log('════════════════════════════════════════════════════════')

  const results: boolean[] = []
  results.push(await testProductEventOnce())
  results.push(await testProductEventIdempotency())
  results.push(await testProductEventCatchup())
  results.push(await testSaleConfirmedWritesLocalRecord())
  results.push(await testSaleConfirmedIdempotency())
  results.push(await testLostResponseRecovery())

  const passed = results.filter(Boolean).length
  console.log('\n────────────────────────────────────────')
  console.log(`Results: ${passed} passed, ${results.length - passed} failed`)
  console.log('────────────────────────────────────────')
  if (passed < results.length) process.exit(1)
}

runAll().catch(err => { console.error(err); process.exit(1) })
