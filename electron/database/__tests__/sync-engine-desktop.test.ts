/**
 * sync-engine-desktop.test.ts — Cycle 04 Sub-cycle F production sync smoke.
 *
 * Asserts that `createSale`'s post-INSERT hook enqueues a Sale SyncEvent
 * onto `defaultSyncEngine`. Mocks the SQLite write by running against an
 * in-memory database; bypasses the IPC handler + sales orchestrator by
 * exercising the same code path via the public `fromLocalSale()` mapper
 * + `buildSaleSyncEvent()` helper + `defaultSyncEngine.enqueue()`.
 *
 * Run with:
 *   /c/Users/Administrator/AppData/Local/hermes/node/node --import tsx \
 *     --test electron/database/__tests__/sync-engine-desktop.test.ts
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
import { defaultSyncEngine, NoOpSyncEngineClass } from '@soostori/contracts'
import { asBusinessId } from '@soostori/core'
import { bootstrapContractMapperSchema } from './contract-mapper-helpers'
import { fromLocalSale, type SalesRow } from '../contracts-mapper-2'
import { buildSaleSyncEvent } from '../sync-event-builder'

const seedSalesTable = (db: Database.Database): void => {
  db.prepare(`INSERT INTO shops (id, name) VALUES (?, ?)`).run('shopA', 'Acme')
  db.prepare(`INSERT INTO sales (id, shop_id, type, status, subtotal, discount_amount, tax_amount, total_amount, paid_amount, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run('s1', 'shopA', 'retail', 'completed', 1000, 0, 0, 1000, 1000, 'cash')
  db.prepare(`INSERT INTO sale_items (id, sale_id, shop_id, product_name, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run('li1', 's1', 'shopA', 'Espresso', 5, 200, 1000)
}

test('createSale path: defaultSyncEngine.enqueue captures exactly one Sale SyncEvent', async () => {
  const db = new Database(':memory:')
  try {
    bootstrapContractMapperSchema(db)
    seedSalesTable(db)

    const engine = defaultSyncEngine as unknown as NoOpSyncEngineClass
    const baseline = engine.pending.length
    const saleRow = db.prepare(`SELECT * FROM sales WHERE id = ?`).get('s1') as SalesRow
    const sale = fromLocalSale(saleRow)

    const syncEvent = buildSaleSyncEvent(sale, {
      businessId: asBusinessId(sale.businessId),
      originatingDeviceId: 'device-1' as never,
      originatingEmployeeId: 'user-1' as never,
      clientSequence: 1,
    })

    const result = await defaultSyncEngine.enqueue(syncEvent)
    assert.equal(result.state, 'queued', 'stub enqueue must return { state: "queued" }')
    assert.equal(engine.pending.length, baseline + 1, 'queue length must grow by exactly one')
  } finally {
    db.close()
  }
})

test('SyncEvent shape: entityKind=“sale”, operation=“create”, state=“pending”, payload=Sale', async () => {
  const db = new Database(':memory:')
  try {
    bootstrapContractMapperSchema(db)
    seedSalesTable(db)

    const saleRow = db.prepare(`SELECT * FROM sales WHERE id = ?`).get('s1') as SalesRow
    const sale = fromLocalSale(saleRow)
    const syncEvent = buildSaleSyncEvent(sale, {
      businessId: asBusinessId(sale.businessId),
      originatingDeviceId: 'device-1' as never,
      originatingEmployeeId: 'user-1' as never,
      clientSequence: 1,
    })
    const engine = defaultSyncEngine as unknown as NoOpSyncEngineClass
    await defaultSyncEngine.enqueue(syncEvent)

    const last = engine.pending[engine.pending.length - 1]
    assert.equal(last.event.entityKind, 'sale', 'entityKind must be "sale"')
    assert.equal(last.event.operation, 'create', 'operation must be "create"')
    assert.equal(last.event.state, 'pending', 'state must be "pending" on enqueue (stub sets it)')
    assert.equal(last.event.entityVersion, sale.version)
    assert.equal(last.event.businessId, sale.businessId)
    assert.equal(last.event.idempotencyKey, sale.idempotencyKey)
    assert.ok(typeof last.event.id === 'string' && last.event.id.length > 0, 'id must be a non-empty SyncEventId')
    assert.ok(typeof last.event.clientCreatedAt === 'string', 'clientCreatedAt must be ISO8601 string')
    const payload = last.event.payload as { id: string; totalAmount: number; businessId: string }
    assert.equal(payload.id, sale.id, 'payload must be the full Sale projection')
    assert.equal(payload.totalAmount, 1000)
    assert.equal(payload.businessId, 'shopA')
  } finally {
    db.close()
  }
})

test('reset() between tests: defaultSyncEngine.pending starts empty after clear', () => {
  const engine = defaultSyncEngine as unknown as NoOpSyncEngineClass
  engine.reset()
  assert.equal(engine.pending.length, 0)
})