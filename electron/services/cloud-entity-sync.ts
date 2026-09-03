/**
 * cloud-entity-sync.ts — Push/pull operational entities to/from cloud.
 *
 * These are the entities that must be shared across all three apps (web, mobile, desktop):
 * products, categories, customers, sales, expenses.
 *
 * Desktop writes its local changes to cloud (push) and can receive updates (pull).
 * The cloud is the source of truth for these entities; local SQLite is the cache.
 */

import { getDatabase } from '../database'
import * as instant from './instant-api'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'

const APP_ID = process.env.INSTANT_APP_ID || ''

// ── Products ──────────────────────────────────────────────────────────────────

export async function pushProduct(productId: string): Promise<void> {
  if (!APP_ID) return
  const db = getDatabase()
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId) as Record<string, unknown> | undefined
  if (!product) return

  const instamlId = `products_${productId}`
  try {
    await instant.instamlTx(APP_ID, [[
      'update', 'products', instamlId, {
        id: productId,
        shopId: product.shop_id as string,
        name: product.name as string,
        barcode: product.barcode as string | null,
        sku: product.sku as string | null,
        categoryId: product.category_id as string | null,
        categoryName: product.category_name as string | null,
        costPrice: Number(product.cost_price) || 0,
        sellingPrice: Number(product.selling_price) || 0,
        groupPrices: product.group_prices as string | null,
        isGroup: product.is_group as number ?? 0,
        unitsPerPackage: product.units_per_package as number ?? 1,
        stockQuantity: Number(product.stock_quantity) || 0,
        currentStock: Number(product.current_stock) || 0,
        lowStockThreshold: Number(product.low_stock_threshold) || 0,
        trackInventory: product.track_inventory as number ?? 1,
        allowSingleUnitSale: product.allow_single_unit_sale as number ?? 1,
        distributorName: product.distributor_name as string | null,
        distributorPhone: product.distributor_phone as string | null,
        image: product.image as string | null,
        isActive: product.is_active as number ?? 1,
        createdAt: product.created_at as string,
        updatedAt: new Date().toISOString(),
      }
    ]])
    log.debug(`pushProduct: ${productId}`)
  } catch (err) {
    log.warn('pushProduct failed:', err)
  }
}

export async function pushAllProducts(): Promise<number> {
  if (!APP_ID) return 0
  const db = getDatabase()
  try {
    const rows = db.prepare('SELECT id FROM products').all() as Array<{ id: string }>
    for (const row of rows) await pushProduct(row.id)
    return rows.length
  } catch (err) {
    log.warn('pushAllProducts failed:', err)
    return 0
  }
}

// ── Categories ────────────────────────────────────────────────────────────────

export async function pushCategory(categoryId: string): Promise<void> {
  if (!APP_ID) return
  const db = getDatabase()
  const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(categoryId) as Record<string, unknown> | undefined
  if (!cat) return

  try {
    await instant.instamlTx(APP_ID, [[
      'update', 'categories', categoryId, {
        id: categoryId,
        shopId: (cat.shop_id as string) ?? '',
        name: cat.name as string,
        color: cat.color as string | null,
        description: cat.description as string | null,
        isActive: cat.is_active as number ?? 1,
        createdAt: cat.created_at as string,
        updatedAt: new Date().toISOString(),
      }
    ]])
  } catch (err) {
    log.warn('pushCategory failed:', err)
  }
}

export async function pushAllCategories(): Promise<number> {
  if (!APP_ID) return 0
  const db = getDatabase()
  try {
    const rows = db.prepare('SELECT id FROM categories').all() as Array<{ id: string }>
    for (const row of rows) await pushCategory(row.id)
    return rows.length
  } catch { return 0 }
}

// ── Sales ─────────────────────────────────────────────────────────────────────

export async function pushSale(saleId: string): Promise<void> {
  if (!APP_ID) return
  const db = getDatabase()
  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId) as Record<string, unknown> | undefined
  if (!sale) return

  try {
    await instant.instamlTx(APP_ID, [[
      'update', 'sales', saleId, {
        id: saleId,
        shopId: (sale.shop_id as string) ?? '',
        userId: (sale.user_id as string) ?? '',
        deviceId: (sale.device_id as string) ?? '',
        type: sale.type as string ?? 'retail',
        status: sale.status as string ?? 'completed',
        subtotal: Number(sale.subtotal) || 0,
        discountAmount: Number(sale.discount_amount) || 0,
        taxAmount: Number(sale.tax_amount) || 0,
        totalAmount: Number(sale.total_amount) || 0,
        paidAmount: Number(sale.paid_amount) || 0,
        paymentMethod: sale.payment_method as string ?? 'cash',
        note: sale.note as string | null,
        customerId: sale.customer_id as string | null,
        customerName: sale.customer_name as string | null,
        customerPhone: sale.customer_phone as string | null,
        itemsSummary: sale.items_summary as string | null,
        createdAt: sale.created_at as string,
        updatedAt: new Date().toISOString(),
      }
    ]])
  } catch (err) {
    log.warn('pushSale failed:', err)
  }
}

// ── Customers ─────────────────────────────────────────────────────────────────

export async function pushCustomer(customerId: string): Promise<void> {
  if (!APP_ID) return
  const db = getDatabase()
  const cust = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId) as Record<string, unknown> | undefined
  if (!cust) return

  try {
    await instant.instamlTx(APP_ID, [[
      'update', 'customers', customerId, {
        id: customerId,
        shopId: (cust.shop_id as string) ?? '',
        name: cust.name as string,
        phone: cust.phone as string | null,
        email: cust.email as string | null,
        idNumber: cust.id_number as string | null,
        address: cust.address as string | null,
        notes: cust.notes as string | null,
        isActive: cust.is_active as number ?? 1,
        createdAt: cust.created_at as string,
        updatedAt: new Date().toISOString(),
      }
    ]])
  } catch (err) {
    log.warn('pushCustomer failed:', err)
  }
}

// ── Expenses ──────────────────────────────────────────────────────────────────

export async function pushExpense(expenseId: string): Promise<void> {
  if (!APP_ID) return
  const db = getDatabase()
  const exp = db.prepare('SELECT * FROM expenses WHERE id = ?').get(expenseId) as Record<string, unknown> | undefined
  if (!exp) return

  try {
    await instant.instamlTx(APP_ID, [[
      'update', 'expenses', expenseId, {
        id: expenseId,
        shopId: (exp.shop_id as string) ?? '',
        categoryId: exp.category_id as string | null,
        categoryName: exp.category_name as string | null,
        amount: Number(exp.amount) || 0,
        description: exp.description as string | null,
        reference: exp.reference as string | null,
        date: exp.date as string,
        createdAt: exp.created_at as string,
        updatedAt: new Date().toISOString(),
      }
    ]])
  } catch (err) {
    log.warn('pushExpense failed:', err)
  }
}
