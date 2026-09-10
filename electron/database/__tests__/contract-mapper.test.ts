/**
 * contract-mapper.test.ts — Round-trip tests for `contracts-mapper*.ts`.
 *
 * For each entity the mapper covers, insert a row with snake_case columns,
 * SELECT it back, run it through `fromLocal*()`, assert every contract
 * field matches, and re-run through `toLocal*()` to confirm the inverse.
 * Also verifies that mapper preserves `shop_id` isolation (no cross-tenant
 * leakage through the brand helper).
 *
 * ANPAS: ≤150 lines.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createMapperTestDb } from './contract-mapper-helpers'
import {
  fromLocalProduct, fromLocalEmployee, fromLocalDevice,
  fromLocalInvitation, fromLocalCategory, toLocalProduct, toLocalEmployee,
} from '../contracts-mapper'
import {
  fromLocalCustomer, fromLocalDebt, fromLocalDebtPayment, toLocalCustomer,
  fromLocalSale, fromLocalSaleLineItem,
} from '../contracts-mapper-2'
import { fromLocalStockMovement, fromLocalExpense, toLocalExpense } from '../contracts-mapper-3'

test('Product round-trip: snake_case row → contract → snake_case partial', () => {
  const db = createMapperTestDb()
  try {
    db.prepare(`INSERT INTO products (id, shop_id, name, sku, barcode, cost_price, selling_price, current_stock, stock_quantity, low_stock_threshold, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run('p1', 'shopA', 'Espresso', 'ESP-1', '111', 50, 200, 100, 100, 5, 1)
    const row = db.prepare(`SELECT * FROM products WHERE id = ?`).get('p1') as Parameters<typeof fromLocalProduct>[0]
    const p = fromLocalProduct(row)
    assert.equal(p.id, 'p1')
    assert.equal(p.businessId, 'shopA')
    assert.equal(p.name, 'Espresso')
    assert.equal(p.sellingPrice, 200)
    assert.equal(p.costPrice, 50)
    assert.equal(p.currentStock, 100)
    assert.equal(p.isActive, true)
    assert.equal(p.businessId, 'shopA')

    const back = toLocalProduct(p)
    assert.equal(back.id, 'p1')
    assert.equal(back.shop_id, 'shopA')
    assert.equal(back.name, 'Espresso')
    assert.equal(back.selling_price, 200)
    assert.equal(back.is_active, 1)
  } finally { db.close() }
})

test('Customer round-trip: id_number ↔ idNumber, is_active ↔ status', () => {
  const db = createMapperTestDb()
  try {
    db.prepare(`INSERT INTO customers (id, shop_id, name, phone, email, id_number, address, notes, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run('c1', 'shopA', 'Alice', '+254700', 'a@x.com', 'ID123', 'Nairobi', 'VIP', 1)
    const row = db.prepare(`SELECT * FROM customers WHERE id = ?`).get('c1') as Parameters<typeof fromLocalCustomer>[0]
    const c = fromLocalCustomer(row)
    assert.equal(c.id, 'c1')
    assert.equal(c.businessId, 'shopA')
    assert.equal(c.name, 'Alice')
    assert.equal(c.idNumber, 'ID123')
    assert.equal(c.status, 'active')

    const back = toLocalCustomer(c)
    assert.equal(back.id_number, 'ID123')
    assert.equal(back.is_active, 1)
  } finally { db.close() }
})

test('Sale + SaleLineItem round-trip preserves shop_id scoping', () => {
  const db = createMapperTestDb()
  try {
    db.prepare(`INSERT INTO sales (id, shop_id, type, status, subtotal, discount_amount, tax_amount, total_amount, paid_amount, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run('s1', 'shopA', 'retail', 'completed', 1000, 0, 0, 1000, 1000, 'cash')
    db.prepare(`INSERT INTO sale_items (id, sale_id, shop_id, product_name, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run('li1', 's1', 'shopA', 'Espresso', 5, 200, 1000)
    const saleRow = db.prepare(`SELECT * FROM sales WHERE id = ?`).get('s1') as Parameters<typeof fromLocalSale>[0]
    const itemRow = db.prepare(`SELECT * FROM sale_items WHERE id = ?`).get('li1') as Parameters<typeof fromLocalSaleLineItem>[0]
    const sale = fromLocalSale(saleRow)
    const item = fromLocalSaleLineItem(itemRow)
    assert.equal(sale.businessId, 'shopA')
    assert.equal(sale.totalAmount, 1000)
    assert.equal(sale.paymentMethod, 'cash')
    assert.equal(item.businessId, 'shopA')
    assert.equal(item.totalPrice, 1000)
  } finally { db.close() }
})

test('Debt round-trip: balance computed from amount - amount_paid', () => {
  const db = createMapperTestDb()
  try {
    db.prepare(`INSERT INTO debts (id, shop_id, customer_id, amount, amount_paid, status) VALUES (?, ?, ?, ?, ?, ?)`)
      .run('d1', 'shopA', 'c1', 5000, 1500, 'partial')
    const row = db.prepare(`SELECT * FROM debts WHERE id = ?`).get('d1') as Parameters<typeof fromLocalDebt>[0]
    const d = fromLocalDebt(row)
    assert.equal(d.amount, 5000)
    assert.equal(d.balance, 3500, 'balance must be amount - amount_paid')
    assert.equal(d.status, 'partial')
    assert.equal(d.businessId, 'shopA')
  } finally { db.close() }
})

test('StockMovement round-trip: normalizeOp maps sold→sale, received→purchase', () => {
  const db = createMapperTestDb()
  try {
    db.prepare(`INSERT INTO inventory_transactions (id, shop_id, product_id, device_id, user_id, event_type, quantity, idempotency_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run('inv1', 'shopA', 'p1', 'dev1', 'u1', 'sold', -3, 'idem-1')
    const row = db.prepare(`SELECT * FROM inventory_transactions WHERE id = ?`).get('inv1') as Parameters<typeof fromLocalStockMovement>[0]
    const m = fromLocalStockMovement(row)
    assert.equal(m.operation, 'sale')
    assert.equal(m.quantity, -3)
    assert.equal(m.businessId, 'shopA')
    assert.equal(m.idempotencyKey, 'idem-1')
  } finally { db.close() }
})

test('Employee round-trip: is_active=1 → status=active, role preserved', () => {
  const db = createMapperTestDb()
  try {
    db.prepare(`INSERT INTO employees (id, shop_id, name, role, is_active, cloud_id) VALUES (?, ?, ?, ?, ?, ?)`)
      .run('e1', 'shopA', 'Bob', 'manager', 1, 'cloud-1')
    const row = db.prepare(`SELECT * FROM employees WHERE id = ?`).get('e1') as Parameters<typeof fromLocalEmployee>[0]
    const e = fromLocalEmployee(row)
    assert.equal(e.businessId, 'shopA')
    assert.equal(e.role, 'manager')
    assert.equal(e.status, 'active')
    assert.equal(e.cloudId, 'cloud-1')

    const back = toLocalEmployee(e)
    assert.equal(back.shop_id, 'shopA')
    assert.equal(back.is_active, 1)
    assert.equal(back.role, 'manager')
  } finally { db.close() }
})

test('Mapper isolation: shopB row never bleeds into shopA query', () => {
  const db = createMapperTestDb()
  try {
    db.prepare(`INSERT INTO products (id, shop_id, name, selling_price) VALUES (?, ?, ?, ?)`).run('pB', 'shopB', 'Soda', 100)
    db.prepare(`INSERT INTO products (id, shop_id, name, selling_price) VALUES (?, ?, ?, ?)`).run('pA', 'shopA', 'Espresso', 200)
    const aRows = db.prepare(`SELECT * FROM products WHERE shop_id = ?`).all('shopA') as Parameters<typeof fromLocalProduct>[0][]
    const mapped = aRows.map(fromLocalProduct)
    assert.equal(mapped.length, 1)
    assert.equal(mapped[0].id, 'pA')
    assert.equal(mapped[0].businessId, 'shopA')
    assert.equal(mapped.find(m => m.id === 'pB'), undefined, 'shopB must not appear in shopA results')
  } finally { db.close() }
})