/**
 * reports-repository.ts — Phase 19: Desktop SQLite implementation for report queries.
 *
 * Implements the queries needed by the Reports SDK layer.
 * Feeds report IPC handlers which expose to the renderer via IPC bridge.
 */

import { getDatabase } from '../database'

export interface SalesReportData {
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

export interface InventoryReportData {
  totalProducts: number
  totalStockValue: number
  lowStockCount: number
  outOfStockCount: number
  deadStock: Array<{ productId: string; name: string; lastMovementDate: string }>
  reorderSuggestions: Array<{ productId: string; name: string; currentStock: number; threshold: number; suggestedOrder: number }>
}

export interface ExpenseReportData {
  total: number
  byCategory: Record<string, number>
  pendingCount: number
  vsPriorMonth: number
}

export interface DebtReportData {
  totalOutstanding: number
  overdueCount: number
  partialCount: number
  agingBuckets: { '0-30': number; '31-60': number; '61-90': number; '90+': number }
  byCustomer: Array<{ customerId: string; name: string; outstanding: number; debtCount: number }>
}

export interface DashboardSummaryData {
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

function getDb() {
  return getDatabase()
}

function resolveShopId(): string {
  try {
    const row = getDb().prepare('SELECT id FROM shops LIMIT 1').get() as { id: string } | undefined
    return row?.id ?? 'default'
  } catch {
    return 'default'
  }
}

// ── Sales Report ───────────────────────────────────────────────────────────────

export function getSalesReport(from: string, to: string): SalesReportData {
  const db = getDb()
  const shopId = resolveShopId()

  // All sales in range
  const sales = db.prepare(`
    SELECT s.*, si.product_id, si.product_name, si.quantity, si.unit_price, si.total_price,
           p.cost_price
    FROM sales s
    LEFT JOIN sale_items si ON si.sale_id = s.id
    LEFT JOIN products p ON p.id = si.product_id
    WHERE s.shop_id = ? AND date(s.created_at) BETWEEN ? AND ?
    ORDER BY s.created_at DESC
  `).all(shopId, from, to) as Array<Record<string, unknown>>

  if (!sales.length) {
    return {
      period: { from, to }, totalSales: 0, totalRevenue: 0, totalCost: 0,
      grossProfit: 0, grossMargin: 0, byPaymentMethod: {},
      topProducts: [], salesCount: 0, averageSaleValue: 0,
    }
  }

  // Unique sales
  const saleMap = new Map<string, { total: number; cost: number; paymentMethod: string }>()
  const productRevenue = new Map<string, { name: string; qty: number; revenue: number }>()
  let totalRevenue = 0
  let totalCost = 0
  const byPaymentMethod: Record<string, { count: number; amount: number }> = {}

  for (const row of sales) {
    const saleId = row.id as string
    const paymentMethod = (row.payment_method as string) ?? 'cash'

    if (!saleMap.has(saleId)) {
      saleMap.set(saleId, {
        total: row.total_amount as number,
        cost: 0,
        paymentMethod,
      })
      totalRevenue += row.total_amount as number
      byPaymentMethod[paymentMethod] = byPaymentMethod[paymentMethod] ?? { count: 0, amount: 0 }
      byPaymentMethod[paymentMethod].count++
      byPaymentMethod[paymentMethod].amount += row.total_amount as number
    }

    if (row.product_id && row.cost_price && row.quantity) {
      const sale = saleMap.get(saleId)!
      sale.cost += (row.cost_price as number) * (row.quantity as number)
      totalCost += (row.cost_price as number) * (row.quantity as number)

      const pid = row.product_id as string
      const existing = productRevenue.get(pid) ?? { name: row.product_name as string, qty: 0, revenue: 0 }
      existing.qty += row.quantity as number
      existing.revenue += row.total_price as number
      productRevenue.set(pid, existing)
    }
  }

  const grossProfit = totalRevenue - totalCost
  const grossMargin = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0
  const salesCount = saleMap.size
  const averageSaleValue = salesCount > 0 ? Math.round(totalRevenue / salesCount) : 0

  const topProducts = [...productRevenue.entries()]
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 10)
    .map(([pid, v]) => ({ productId: pid, name: v.name, quantitySold: v.qty, revenue: v.revenue }))

  return {
    period: { from, to },
    totalSales: salesCount,
    totalRevenue,
    totalCost,
    grossProfit,
    grossMargin,
    byPaymentMethod,
    topProducts,
    salesCount,
    averageSaleValue,
  }
}

// ── Inventory Report ──────────────────────────────────────────────────────────

export function getInventoryReport(): InventoryReportData {
  const db = getDb()
  const shopId = resolveShopId()

  const products = db.prepare(`
    SELECT id, name, current_stock, low_stock_threshold FROM products
    WHERE shop_id = ? AND is_active = 1
  `).all(shopId) as Array<{ id: string; name: string; current_stock: number; low_stock_threshold: number }>

  const threshold = 5
  let totalStockValue = 0
  let lowStockCount = 0
  let outOfStockCount = 0
  const deadStock: Array<{ productId: string; name: string; lastMovementDate: string }> = []
  const reorderSuggestions: Array<{ productId: string; name: string; currentStock: number; threshold: number; suggestedOrder: number }> = []

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()

  for (const p of products) {
    const stock = p.current_stock ?? 0
    const thresh = p.low_stock_threshold ?? threshold
    const cost = (db.prepare('SELECT cost_price FROM products WHERE id = ?').get(p.id) as { cost_price: number } | undefined)?.cost_price ?? 0
    totalStockValue += stock * cost

    if (stock === 0) outOfStockCount++
    else if (stock <= thresh) lowStockCount++

    // Dead stock check — no movement in 30 days
    const lastMove = db.prepare(`
      SELECT created_at FROM stock_movements WHERE product_id = ? ORDER BY created_at DESC LIMIT 1
    `).get(p.id) as { created_at: string } | undefined

    if (!lastMove || lastMove.created_at < thirtyDaysAgo) {
      deadStock.push({ productId: p.id, name: p.name, lastMovementDate: lastMove?.created_at ?? 'never' })
    }

    if (stock <= thresh) {
      reorderSuggestions.push({
        productId: p.id,
        name: p.name,
        currentStock: stock,
        threshold: thresh,
        suggestedOrder: Math.max(0, thresh * 2 - stock),
      })
    }
  }

  return {
    totalProducts: products.length,
    totalStockValue,
    lowStockCount,
    outOfStockCount,
    deadStock: deadStock.slice(0, 20),
    reorderSuggestions: reorderSuggestions.slice(0, 20),
  }
}

// ── Expense Report ───────────────────────────────────────────────────────────

export function getExpenseReport(month: string): ExpenseReportData {
  // month format: "YYYY-MM"
  const db = getDb()
  const shopId = resolveShopId()
  const from = `${month}-01`
  const to = `${month}-31`

  const expenses = db.prepare(`
    SELECT amount, category, date FROM expenses WHERE shop_id = ? AND date BETWEEN ? AND ?
  `).all(shopId, from, to) as Array<{ amount: number; category: string }>

  const byCategory: Record<string, number> = {}
  let total = 0
  for (const e of expenses) {
    total += e.amount
    byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount
  }

  // Prior month for comparison
  const [y, m] = month.split('-').map(Number)
  const prevDate = new Date(y, m - 2, 1)
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
  const prevFrom = `${prevMonth}-01`
  const prevTo = `${prevMonth}-31`
  const prevTotal = (db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE shop_id = ? AND date BETWEEN ? AND ?
  `).get(shopId, prevFrom, prevTo) as { total: number }).total

  const vsPriorMonth = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : 0

  return { total, byCategory, pendingCount: 0, vsPriorMonth }
}

// ── Debt Report ──────────────────────────────────────────────────────────────

export function getDebtReport(): DebtReportData {
  const db = getDb()
  const shopId = resolveShopId()

  const debts = db.prepare(`
    SELECT d.*, c.name as customer_name
    FROM debts d
    LEFT JOIN customers c ON c.id = d.customer_id
    WHERE d.shop_id = ? AND d.status != 'settled'
  `).all(shopId) as Array<{
    id: string; customer_id: string; customer_name: string
    amount: number; amount_paid: number; created_at: string
  }>

  const agingBuckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }
  const customerMap = new Map<string, { name: string; outstanding: number; debtCount: number }>()
  let totalOutstanding = 0
  let overdueCount = 0
  let partialCount = 0
  const now = Date.now()

  for (const d of debts) {
    const outstanding = (d.amount ?? 0) - (d.amount_paid ?? 0)
    if (outstanding <= 0) continue

    totalOutstanding += outstanding
    if (d.amount_paid > 0 && d.amount_paid < d.amount) partialCount++

    const ageDays = Math.floor((now - new Date(d.created_at).getTime()) / 86400000)
    if (ageDays > 60) overdueCount++

    if (ageDays <= 30) agingBuckets['0-30'] += outstanding
    else if (ageDays <= 60) agingBuckets['31-60'] += outstanding
    else if (ageDays <= 90) agingBuckets['61-90'] += outstanding
    else agingBuckets['90+'] += outstanding

    const cid = d.customer_id ?? 'unknown'
    const existing = customerMap.get(cid) ?? { name: d.customer_name ?? 'Unknown', outstanding: 0, debtCount: 0 }
    existing.outstanding += outstanding
    existing.debtCount++
    customerMap.set(cid, existing)
  }

  const byCustomer = [...customerMap.entries()]
    .sort((a, b) => b[1].outstanding - a[1].outstanding)
    .slice(0, 50)
    .map(([cid, v]) => ({ customerId: cid, name: v.name, outstanding: v.outstanding, debtCount: v.debtCount }))

  return { totalOutstanding, overdueCount, partialCount, agingBuckets, byCustomer }
}

// ── Dashboard Summary ────────────────────────────────────────────────────────

export function getDashboardSummary(): DashboardSummaryData {
  const db = getDb()
  const shopId = resolveShopId()
  const today = new Date().toISOString().slice(0, 10)
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

  const todayRow = (db.prepare(`
    SELECT COALESCE(SUM(total_amount), 0) as total, COUNT(*) as count
    FROM sales WHERE shop_id = ? AND date(created_at) = ?
  `).get(shopId, today) as { total: number; count: number }) ?? { total: 0, count: 0 }

  const weekRow = (db.prepare(`
    SELECT COALESCE(SUM(total_amount), 0) as total FROM sales WHERE shop_id = ? AND date(created_at) BETWEEN ? AND ?
  `).get(shopId, weekAgo, today) as { total: number }) ?? { total: 0 }

  const monthRow = (db.prepare(`
    SELECT COALESCE(SUM(total_amount), 0) as total, COALESCE(SUM(subtotal), 0) as cost
    FROM sales WHERE shop_id = ? AND date(created_at) BETWEEN ? AND ?
  `).get(shopId, monthStart, today) as { total: number; cost: number }) ?? { total: 0, cost: 0 }

  const monthRevenue = monthRow.total
  const monthCost = monthRow.cost
  const grossProfit = monthRevenue - monthCost
  const grossMargin = monthRevenue > 0 ? Math.round((grossProfit / monthRevenue) * 100) : 0

  const lowStockCount = (db.prepare(`
    SELECT COUNT(*) as n FROM products WHERE shop_id = ? AND is_active = 1 AND current_stock <= low_stock_threshold
  `).get(shopId) as { n: number }).n

  const outstandingDebts = (db.prepare(`
    SELECT COALESCE(SUM(amount - amount_paid), 0) as total FROM debts WHERE shop_id = ? AND status != 'settled'
  `).get(shopId) as { total: number }).total

  const pendingExpenses = (db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE shop_id = ? AND date >= ?
  `).get(shopId, monthStart) as { total: number }).total

  const activeCustomers = (db.prepare(`
    SELECT COUNT(*) as n FROM customers WHERE shop_id = ? AND is_active = 1
  `).get(shopId) as { n: number }).n

  return {
    todaySales: todayRow.count,
    weekSales: weekRow.total,
    monthSales: monthRevenue,
    todayRevenue: todayRow.total,
    weekRevenue: weekRow.total,
    monthRevenue,
    monthCost,
    grossProfit,
    grossMargin,
    lowStockCount,
    outstandingDebts,
    pendingExpenses,
    activeCustomers,
  }
}
