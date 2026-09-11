/**
 * report-handlers.ts — Phase 13: Reporting & Dashboards for Desktop POS.
 *
 * All five report types are read-only — no mutations, no sync events.
 *
 * Canonical sources:
 *   - Sales:     sales + sale_items tables (completed only)
 *   - Inventory: products + inventory_transactions tables
 *   - Debt:      debts + debt_payments tables (append-only balance)
 *   - Expense:   expenses table (per month)
 */

import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { resolveActiveShopId } from '../database/active-shop'
import log from 'electron-log'

// ── Shared helpers ─────────────────────────────────────────────────────────────

function todayStart(): string {
  const local = new Date(Date.now() + (3 * 60 * 60 * 1000))
  return local.toISOString().slice(0, 10) + 'T00:00:00'
}

function todayEnd(): string {
  const local = new Date(Date.now() + (3 * 60 * 60 * 1000))
  return local.toISOString().slice(0, 10) + 'T23:59:59'
}

function weekStart(): string {
  const local = new Date(Date.now() + (3 * 60 * 60 * 1000))
  local.setDate(local.getDate() - 7)
  return local.toISOString().slice(0, 10) + 'T00:00:00'
}

function monthStart(): string {
  const local = new Date(Date.now() + (3 * 60 * 60 * 1000))
  local.setDate(1)
  return local.toISOString().slice(0, 10) + 'T00:00:00'
}

function toDateEnd(dateStr: string): string {
  return dateStr + 'T23:59:59'
}

// ── Dashboard Summary ───────────────────────────────────────────────────────────

export interface DashboardSummary {
  todaySales: number
  weekSales: number
  monthSales: number
  todayRevenue: number
  weekRevenue: number
  monthRevenue: number
  monthCost: number
  grossProfit: number
  grossMargin: number
  lowStockCount: number
  outstandingDebts: number
  pendingExpenses: number
  activeCustomers: number
}

function queryDashboardSummary(shopId: string): DashboardSummary {
  const db = getDatabase()
  const now = new Date().toISOString().slice(0, 10)
  const startOfToday = todayStart()
  const endOfToday = todayEnd()
  const startOfWeek = weekStart()
  const startOfMonth = monthStart()

  // Sales revenue for today / week / month
  const periodRows = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN created_at >= ? AND created_at <= ? THEN total_amount ELSE 0 END), 0) as today,
      COALESCE(SUM(CASE WHEN created_at >= ? AND created_at <= ? THEN total_amount ELSE 0 END), 0) as week,
      COALESCE(SUM(CASE WHEN created_at >= ? AND created_at <= ? THEN total_amount ELSE 0 END), 0) as month
    FROM sales
    WHERE shop_id = ? AND status = 'completed'
  `).get(startOfToday, endOfToday, startOfWeek, endOfToday, startOfMonth, endOfToday, shopId) as {
    today: number; week: number; month: number
  }

  // Month cost from sale_items (cost_price * quantity)
  const costRow = db.prepare(`
    SELECT COALESCE(SUM(si.quantity * COALESCE(p.cost_price, 0)), 0) as cost
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    LEFT JOIN products p ON si.product_id = p.id
    WHERE s.shop_id = ?
      AND s.status = 'completed'
      AND s.created_at >= ?
      AND s.created_at <= ?
  `).get(shopId, startOfMonth, endOfToday) as { cost: number }

  const monthRevenue = periodRows.month
  const monthCost = costRow.cost
  const grossProfit = Math.max(0, monthRevenue - monthCost)
  const grossMargin = monthRevenue > 0 ? (grossProfit / monthRevenue) * 100 : 0

  // Low-stock count
  const lowStockRow = db.prepare(`
    SELECT COUNT(*) as cnt FROM products
    WHERE shop_id = ? AND is_active = 1 AND track_inventory = 1
      AND current_stock > 0 AND current_stock <= low_stock_threshold
  `).get(shopId) as { cnt: number }

  // Outstanding debts
  const debtRows = db.prepare(`
    SELECT d.id, d.amount FROM debts d WHERE d.shop_id = ? AND d.status != 'paid'
  `).all(shopId) as { id: string; amount: number }[]
  let outstandingDebts = 0
  for (const row of debtRows) {
    const paidRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as paid FROM debt_payments WHERE debt_id = ?
    `).get(row.id) as { paid: number }
    outstandingDebts += Math.max(0, row.amount - paidRow.paid)
  }

  // Pending expenses
  const pendingExpRow = db.prepare(`
    SELECT COUNT(*) as cnt FROM expenses WHERE shop_id = ? AND status = 'pending'
  `).get(shopId) as { cnt: number }

  // Active customers
  const customerRow = db.prepare(`
    SELECT COUNT(*) as cnt FROM customers WHERE shop_id = ?
  `).get(shopId) as { cnt: number }

  return {
    todaySales: periodRows.today,
    weekSales: periodRows.week,
    monthSales: periodRows.month,
    todayRevenue: periodRows.today,
    weekRevenue: periodRows.week,
    monthRevenue,
    monthCost,
    grossProfit,
    grossMargin: Math.round(grossMargin * 10) / 10,
    lowStockCount: lowStockRow.cnt,
    outstandingDebts,
    pendingExpenses: pendingExpRow.cnt,
    activeCustomers: customerRow.cnt,
  }
}

// ── Sales Report ────────────────────────────────────────────────────────────────

export interface SalesReport {
  period: { from: string; to: string }
  totalSales: number
  totalRevenue: number
  totalCost: number
  grossProfit: number
  grossMargin: number
  byPaymentMethod: Record<string, { count: number; amount: number }>
  topProducts: Array<{ productId: string; name: string; quantitySold: number; revenue: number }>
  salesCount: number
  averageSaleValue: number
}

function querySalesReport(shopId: string, from: string, to: string): SalesReport {
  const db = getDatabase()
  const start = from + 'T00:00:00'
  const end = toDateEnd(to)

  const summaryRow = db.prepare(`
    SELECT
      COUNT(*) as cnt,
      COALESCE(SUM(total_amount), 0) as total,
      COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) as cash,
      COALESCE(SUM(CASE WHEN payment_method IN ('mpesa','mobile_money') THEN total_amount ELSE 0 END), 0) as mpesa,
      COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total_amount ELSE 0 END), 0) as card,
      COALESCE(SUM(CASE WHEN payment_method = 'debt' THEN total_amount ELSE 0 END), 0) as debt
    FROM sales
    WHERE shop_id = ? AND status = 'completed' AND created_at >= ? AND created_at <= ?
  `).get(shopId, start, end) as {
    cnt: number; total: number; cash: number; mpesa: number; card: number; debt: number
  }

  const costRow = db.prepare(`
    SELECT COALESCE(SUM(si.quantity * COALESCE(p.cost_price, 0)), 0) as cost
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    LEFT JOIN products p ON si.product_id = p.id
    WHERE s.shop_id = ? AND s.status = 'completed' AND s.created_at >= ? AND s.created_at <= ?
  `).get(shopId, start, end) as { cost: number }

  const topProductsRows = db.prepare(`
    SELECT si.product_id, si.product_name,
           SUM(si.quantity) as qty, SUM(si.total_price) as revenue
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    WHERE s.shop_id = ? AND s.status = 'completed' AND s.created_at >= ? AND s.created_at <= ?
    GROUP BY si.product_id
    ORDER BY revenue DESC
    LIMIT 10
  `).all(shopId, start, end) as {
    product_id: string | null; product_name: string; qty: number; revenue: number
  }[]

  const totalRevenue = summaryRow.total
  const totalCost = costRow.cost
  const grossProfit = Math.max(0, totalRevenue - totalCost)
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0

  const byPaymentMethod: Record<string, { count: number; amount: number }> = {}
  const cashCount = db.prepare(`
    SELECT COUNT(*) as cnt FROM sales WHERE shop_id = ? AND status = 'completed'
      AND created_at >= ? AND created_at <= ? AND payment_method = 'cash'
  `).get(shopId, start, end) as { cnt: number }
  const mpesaCount = db.prepare(`
    SELECT COUNT(*) as cnt FROM sales WHERE shop_id = ? AND status = 'completed'
      AND created_at >= ? AND created_at <= ? AND payment_method IN ('mpesa','mobile_money')
  `).get(shopId, start, end) as { cnt: number }
  const cardCount = db.prepare(`
    SELECT COUNT(*) as cnt FROM sales WHERE shop_id = ? AND status = 'completed'
      AND created_at >= ? AND created_at <= ? AND payment_method = 'card'
  `).get(shopId, start, end) as { cnt: number }
  const debtCount = db.prepare(`
    SELECT COUNT(*) as cnt FROM sales WHERE shop_id = ? AND status = 'completed'
      AND created_at >= ? AND created_at <= ? AND payment_method = 'debt'
  `).get(shopId, start, end) as { cnt: number }

  byPaymentMethod['cash'] = { count: cashCount.cnt, amount: summaryRow.cash }
  byPaymentMethod['mpesa'] = { count: mpesaCount.cnt, amount: summaryRow.mpesa }
  byPaymentMethod['card'] = { count: cardCount.cnt, amount: summaryRow.card }
  byPaymentMethod['debt'] = { count: debtCount.cnt, amount: summaryRow.debt }

  return {
    period: { from, to },
    totalSales: summaryRow.total,
    totalRevenue,
    totalCost,
    grossProfit,
    grossMargin: Math.round(grossMargin * 10) / 10,
    byPaymentMethod,
    topProducts: topProductsRows.map(r => ({
      productId: r.product_id ?? '',
      name: r.product_name,
      quantitySold: r.qty,
      revenue: r.revenue,
    })),
    salesCount: summaryRow.cnt,
    averageSaleValue: summaryRow.cnt > 0 ? totalRevenue / summaryRow.cnt : 0,
  }
}

// ── Inventory Report ────────────────────────────────────────────────────────────

export interface InventoryReport {
  totalProducts: number
  totalStockValue: number
  lowStockCount: number
  outOfStockCount: number
  deadStock: Array<{ productId: string; name: string; lastMovementDate: string }>
  reorderSuggestions: Array<{ productId: string; name: string; currentStock: number; threshold: number; suggestedOrder: number }>
}

function queryInventoryReport(shopId: string): InventoryReport {
  const db = getDatabase()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

  const totalProductsRow = db.prepare(`
    SELECT COUNT(*) as cnt FROM products WHERE shop_id = ? AND is_active = 1 AND track_inventory = 1
  `).get(shopId) as { cnt: number }

  const stockValueRow = db.prepare(`
    SELECT COALESCE(SUM(current_stock * COALESCE(cost_price, 0)), 0) as val
    FROM products WHERE shop_id = ? AND is_active = 1 AND track_inventory = 1
  `).get(shopId) as { val: number }

  const lowStockRow = db.prepare(`
    SELECT COUNT(*) as cnt FROM products
    WHERE shop_id = ? AND is_active = 1 AND track_inventory = 1
      AND current_stock > 0 AND current_stock <= low_stock_threshold
  `).get(shopId) as { cnt: number }

  const outOfStockRow = db.prepare(`
    SELECT COUNT(*) as cnt FROM products
    WHERE shop_id = ? AND is_active = 1 AND track_inventory = 1 AND current_stock = 0
  `).get(shopId) as { cnt: number }

  // Dead stock: no inventory_transactions in > 30 days AND current_stock > 0
  const deadStockRows = db.prepare(`
    SELECT p.id, p.name, COALESCE(MAX(it.created_at), '') as last_date
    FROM products p
    LEFT JOIN inventory_transactions it ON it.product_id = p.id
    WHERE p.shop_id = ? AND p.is_active = 1 AND p.track_inventory = 1 AND p.current_stock > 0
    GROUP BY p.id
    HAVING last_date = '' OR last_date < ?
    LIMIT 20
  `).all(shopId, thirtyDaysAgo) as { id: string; name: string; last_date: string }[]

  // Reorder suggestions: low stock (not out of stock)
  const reorderRows = db.prepare(`
    SELECT id, name, current_stock, low_stock_threshold
    FROM products
    WHERE shop_id = ? AND is_active = 1 AND track_inventory = 1
      AND current_stock > 0 AND current_stock <= low_stock_threshold
    ORDER BY current_stock ASC
    LIMIT 20
  `).all(shopId) as { id: string; name: string; current_stock: number; low_stock_threshold: number }[]

  return {
    totalProducts: totalProductsRow.cnt,
    totalStockValue: stockValueRow.val,
    lowStockCount: lowStockRow.cnt,
    outOfStockCount: outOfStockRow.cnt,
    deadStock: deadStockRows.map(r => ({
      productId: r.id,
      name: r.name,
      lastMovementDate: r.last_date || 'never',
    })),
    reorderSuggestions: reorderRows.map(r => ({
      productId: r.id,
      name: r.name,
      currentStock: r.current_stock,
      threshold: r.low_stock_threshold,
      suggestedOrder: Math.max(0, r.low_stock_threshold * 2 - r.current_stock),
    })),
  }
}

// ── Debt Report ─────────────────────────────────────────────────────────────────

export interface DebtReport {
  totalOutstanding: number
  overdueCount: number
  partialCount: number
  agingBuckets: { '0-30': number; '31-60': number; '61-90': number; '90+': number }
  byCustomer: Array<{ customerId: string; name: string; outstanding: number; debtCount: number }>
}

function queryDebtReport(shopId: string): DebtReport {
  const db = getDatabase()
  const now = new Date().toISOString().slice(0, 10)

  const debtRows = db.prepare(`
    SELECT d.id, d.amount, d.due_date, d.created_at, COALESCE(c.name, 'Walk-in Customer') as customer_name, c.id as customer_id
    FROM debts d
    LEFT JOIN customers c ON d.customer_id = c.id
    WHERE d.shop_id = ? AND d.status != 'paid'
  `).all(shopId) as {
    id: string; amount: number; due_date: string | null; created_at: string
    customer_name: string; customer_id: string | null
  }[]

  let totalOutstanding = 0
  let overdueCount = 0
  let partialCount = 0
  const agingBuckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }
  const customerMap: Record<string, { name: string; outstanding: number; count: number }> = {}

  for (const row of debtRows) {
    const paidRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as paid FROM debt_payments WHERE debt_id = ?
    `).get(row.id) as { paid: number }
    const balance = Math.max(0, row.amount - paidRow.paid)
    if (balance <= 0) continue

    totalOutstanding += balance

    if (row.due_date && row.due_date < now) overdueCount++
    if (balance < row.amount) partialCount++

    // Age bucket based on created_at
    const createdDate = row.created_at.slice(0, 10)
    const daysSinceCreation = Math.floor((Date.now() - new Date(createdDate).getTime()) / 86400000)
    if (daysSinceCreation <= 30) agingBuckets['0-30'] += balance
    else if (daysSinceCreation <= 60) agingBuckets['31-60'] += balance
    else if (daysSinceCreation <= 90) agingBuckets['61-90'] += balance
    else agingBuckets['90+'] += balance

    const custKey = row.customer_id ?? 'walkin'
    if (!customerMap[custKey]) customerMap[custKey] = { name: row.customer_name, outstanding: 0, count: 0 }
    customerMap[custKey].outstanding += balance
    customerMap[custKey].count++
  }

  const byCustomer = Object.entries(customerMap)
    .map(([customerId, v]) => ({ customerId, name: v.name, outstanding: v.outstanding, debtCount: v.count }))
    .sort((a, b) => b.outstanding - a.outstanding)

  return { totalOutstanding, overdueCount, partialCount, agingBuckets, byCustomer }
}

// ── Expense Report ──────────────────────────────────────────────────────────────

export interface ExpenseReport {
  total: number
  byCategory: Record<string, number>
  pendingCount: number
  vsPriorMonth: number
}

function queryExpenseReport(shopId: string, month: string): ExpenseReport {
  const db = getDatabase()
  // month = "YYYY-MM"
  const [year, monthNum] = month.split('-').map(Number)
  const startOfMonth = `${month}-01T00:00:00`
  const endOfMonth = `${month}-${String(new Date(year, monthNum, 0).getDate()).padStart(2, '0')}T23:59:59`

  // Prior month
  const priorMonthDate = new Date(year, monthNum - 2, 1)
  const priorMonth = `${priorMonthDate.getFullYear()}-${String(priorMonthDate.getMonth() + 1).padStart(2, '0')}`
  const priorStart = `${priorMonth}-01T00:00:00`
  const priorEnd = `${priorMonth}-${String(new Date(priorMonthDate.getFullYear(), priorMonthDate.getMonth() + 1, 0).getDate()).padStart(2, '0')}T23:59:59`

  const totalRow = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM expenses
    WHERE shop_id = ? AND date >= ? AND date <= ?
  `).get(shopId, startOfMonth.slice(0, 10), endOfMonth.slice(0, 10)) as { total: number }

  const priorTotalRow = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM expenses
    WHERE shop_id = ? AND date >= ? AND date <= ?
  `).get(shopId, priorStart.slice(0, 10), priorEnd.slice(0, 10)) as { total: number }

  const byCategoryRows = db.prepare(`
    SELECT category, COALESCE(SUM(amount), 0) as total FROM expenses
    WHERE shop_id = ? AND date >= ? AND date <= ?
    GROUP BY category
  `).all(shopId, startOfMonth.slice(0, 10), endOfMonth.slice(0, 10)) as { category: string; total: number }[]

  const pendingRow = db.prepare(`
    SELECT COUNT(*) as cnt FROM expenses WHERE shop_id = ? AND status = 'pending'
  `).get(shopId) as { cnt: number }

  const byCategory: Record<string, number> = {}
  for (const r of byCategoryRows) byCategory[r.category] = r.total

  const vsPriorMonth = priorTotalRow.total > 0
    ? Math.round(((totalRow.total - priorTotalRow.total) / priorTotalRow.total) * 1000) / 10
    : 0

  return { total: totalRow.total, byCategory, pendingCount: pendingRow.cnt, vsPriorMonth }
}

// ── IPC registration ────────────────────────────────────────────────────────────

export function registerReportHandlers(): void {
  ipcMain.handle('db:reports:dashboardSummary', async (): Promise<DashboardSummary> => {
    const shopId = await resolveActiveShopId()
    return queryDashboardSummary(shopId)
  })

  ipcMain.handle('db:reports:sales', async (_event, from: string, to: string): Promise<SalesReport> => {
    const shopId = await resolveActiveShopId()
    return querySalesReport(shopId, from, to)
  })

  ipcMain.handle('db:reports:inventory', async (): Promise<InventoryReport> => {
    const shopId = await resolveActiveShopId()
    return queryInventoryReport(shopId)
  })

  ipcMain.handle('db:reports:debt', async (): Promise<DebtReport> => {
    const shopId = await resolveActiveShopId()
    return queryDebtReport(shopId)
  })

  ipcMain.handle('db:reports:expense', async (_event, month: string): Promise<ExpenseReport> => {
    const shopId = await resolveActiveShopId()
    return queryExpenseReport(shopId, month)
  })

  log.info('Report IPC handlers registered (Phase 13)')
}
