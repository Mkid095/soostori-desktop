/**
 * shop-isolation.test.ts — Cross-business isolation integration test (§7).
 *
 * Verifies that the new shop_id column on products, categories, customers,
 * sales, sale_items, debts, expenses, held_sales fully isolates data between
 * two distinct business tenants. Uses Node's built-in node:test + tsx runner.
 *
 * Run with:
 *   /c/Program\ Files/nodejs/node --import tsx --test electron/database/__tests__/shop-isolation.test.ts
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createTestDb } from './shop-isolation-bootstrap'

test('products: shopA sees 1 product, shopB sees 1 product, cross-query returns 0', () => {
  const db = createTestDb()
  try {
    db.prepare(`INSERT INTO products (id, name, selling_price, shop_id) VALUES (?, ?, ?, ?)`)
      .run('prodA1', 'Espresso', 200, 'shopA')
    db.prepare(`INSERT INTO products (id, name, selling_price, shop_id) VALUES (?, ?, ?, ?)`)
      .run('prodB1', 'Soda', 100, 'shopB')

    const aRows = db.prepare(`SELECT * FROM products WHERE shop_id = ?`).all('shopA') as Array<{ id: string }>
    const bRows = db.prepare(`SELECT * FROM products WHERE shop_id = ?`).all('shopB') as Array<{ id: string }>
    assert.equal(aRows.length, 1)
    assert.equal(aRows[0].id, 'prodA1')
    assert.equal(bRows.length, 1)
    assert.equal(bRows[0].id, 'prodB1')

    const crossLookup = db.prepare(`SELECT * FROM products WHERE id = ? AND shop_id = ?`).get('prodA1', 'shopB')
    assert.equal(crossLookup, undefined, 'shopA product must not be visible to shopB')

    const unscoped = db.prepare(`SELECT * FROM products WHERE shop_id = ?`).all('shopA')
    assert.equal(unscoped.find(r => (r as { id: string }).id === 'prodB1'), undefined)
  } finally {
    db.close()
  }
})

test('customers: shopA and shopB have isolated customer lists; cross-shop UPDATE affects 0 rows', () => {
  const db = createTestDb()
  try {
    db.prepare(`INSERT INTO customers (id, name, shop_id) VALUES (?, ?, ?)`).run('custA1', 'Alice', 'shopA')
    db.prepare(`INSERT INTO customers (id, name, shop_id) VALUES (?, ?, ?)`).run('custB1', 'Bob', 'shopB')

    const a = db.prepare(`SELECT * FROM customers WHERE shop_id = ? AND is_active = 1`).all('shopA') as Array<{ id: string }>
    const b = db.prepare(`SELECT * FROM customers WHERE shop_id = ? AND is_active = 1`).all('shopB') as Array<{ id: string }>
    assert.equal(a.length, 1)
    assert.equal(b.length, 1)
    assert.equal(a[0].id, 'custA1')
    assert.equal(b[0].id, 'custB1')

    const updated = db.prepare(`UPDATE customers SET name = 'Hacked' WHERE id = ? AND shop_id = ?`)
      .run('custB1', 'shopA')
    assert.equal(updated.changes, 0, 'cross-shop UPDATE must affect 0 rows')
  } finally {
    db.close()
  }
})

test('sales + sale_items: shopA sale items are not visible to shopB via JOIN', () => {
  const db = createTestDb()
  try {
    db.prepare(`INSERT INTO sales (id, subtotal, total_amount, paid_amount, shop_id) VALUES (?, ?, ?, ?, ?)`)
      .run('saleA1', 1000, 1000, 1000, 'shopA')
    db.prepare(`INSERT INTO sale_items (id, sale_id, product_name, quantity, unit_price, total_price, shop_id) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run('itemA1', 'saleA1', 'Espresso', 5, 200, 1000, 'shopA')
    db.prepare(`INSERT INTO sales (id, subtotal, total_amount, paid_amount, shop_id) VALUES (?, ?, ?, ?, ?)`)
      .run('saleB1', 500, 500, 500, 'shopB')
    db.prepare(`INSERT INTO sale_items (id, sale_id, product_name, quantity, unit_price, total_price, shop_id) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run('itemB1', 'saleB1', 'Soda', 5, 100, 500, 'shopB')

    const aSales = db.prepare(`SELECT * FROM sales WHERE shop_id = ?`).all('shopA') as Array<{ id: string }>
    const aItems = db.prepare(`SELECT * FROM sale_items WHERE shop_id = ?`).all('shopA') as Array<{ id: string }>
    assert.equal(aSales.length, 1)
    assert.equal(aItems.length, 1)
    assert.equal(aSales[0].id, 'saleA1')

    // Join with shop_id scope on both sides
    const joinRows = db.prepare(`
      SELECT s.id as sale_id, si.product_name FROM sales s
      JOIN sale_items si ON si.sale_id = s.id
      WHERE s.shop_id = ? AND si.shop_id = s.shop_id
    `).all('shopA') as Array<{ product_name: string }>
    assert.equal(joinRows.length, 1)
    assert.equal(joinRows[0].product_name, 'Espresso')
  } finally {
    db.close()
  }
})

test('debts and expenses: per-shop summary returns isolated totals', () => {
  const db = createTestDb()
  try {
    db.prepare(`INSERT INTO debts (id, amount, shop_id) VALUES (?, ?, ?)`).run('debtA1', 5000, 'shopA')
    db.prepare(`INSERT INTO debts (id, amount, shop_id) VALUES (?, ?, ?)`).run('debtB1', 9999, 'shopB')
    db.prepare(`INSERT INTO expenses (id, amount, category, date, shop_id) VALUES (?, ?, ?, ?, ?)`)
      .run('expA1', 200, 'rent', '2025-09-10', 'shopA')
    db.prepare(`INSERT INTO expenses (id, amount, category, date, shop_id) VALUES (?, ?, ?, ?, ?)`)
      .run('expB1', 800, 'utilities', '2025-09-10', 'shopB')

    const aDebtTotal = (db.prepare(`SELECT COALESCE(SUM(amount - amount_paid), 0) as val FROM debts WHERE status != 'paid' AND shop_id = ?`).get('shopA') as { val: number }).val
    const bDebtTotal = (db.prepare(`SELECT COALESCE(SUM(amount - amount_paid), 0) as val FROM debts WHERE status != 'paid' AND shop_id = ?`).get('shopB') as { val: number }).val
    assert.equal(aDebtTotal, 5000)
    assert.equal(bDebtTotal, 9999)

    const aExpenses = db.prepare(`SELECT * FROM expenses WHERE shop_id = ?`).all('shopA') as Array<{ id: string }>
    assert.equal(aExpenses.length, 1)
    assert.equal(aExpenses[0].id, 'expA1')
  } finally {
    db.close()
  }
})

test('categories: shop-scoped lookup prevents cross-shop name collision', () => {
  const db = createTestDb()
  try {
    db.prepare(`INSERT INTO categories (id, name, shop_id) VALUES (?, ?, ?)`).run('catA1', 'Beverages', 'shopA')
    db.prepare(`INSERT INTO categories (id, name, shop_id) VALUES (?, ?, ?)`).run('catB1', 'Beverages', 'shopB')

    const aCat = db.prepare(`SELECT id FROM categories WHERE LOWER(name) = LOWER(?) AND shop_id = ?`).get('Beverages', 'shopA') as { id: string } | undefined
    const bCat = db.prepare(`SELECT id FROM categories WHERE LOWER(name) = LOWER(?) AND shop_id = ?`).get('Beverages', 'shopB') as { id: string } | undefined
    assert.equal(aCat?.id, 'catA1')
    assert.equal(bCat?.id, 'catB1')
    assert.notEqual(aCat?.id, bCat?.id)
  } finally {
    db.close()
  }
})

test('held_sales: cross-shop restore returns undefined', () => {
  const db = createTestDb()
  try {
    db.prepare(`INSERT INTO held_sales (id, cart_items, shop_id) VALUES (?, ?, ?)`).run('holdA1', '[]', 'shopA')
    db.prepare(`INSERT INTO held_sales (id, cart_items, shop_id) VALUES (?, ?, ?)`).run('holdB1', '[]', 'shopB')

    const aList = db.prepare(`SELECT * FROM held_sales WHERE shop_id = ?`).all('shopA') as Array<{ id: string }>
    assert.equal(aList.length, 1)
    assert.equal(aList[0].id, 'holdA1')

    const cross = db.prepare(`SELECT * FROM held_sales WHERE id = ? AND shop_id = ?`).get('holdB1', 'shopA')
    assert.equal(cross, undefined)
  } finally {
    db.close()
  }
})
