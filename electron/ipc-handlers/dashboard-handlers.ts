/**
 * dashboard-handlers.ts — Phase 12: Fast operational dashboard for POS.
 *
 * Purpose:
 *   Surface today's sales totals, stock health, and debt indicators at a glance.
 *   Designed for speed — single-shot SQLite queries, no sync, no aggregation
 *   across devices. Desktop is POS, not the control tower.
 *
 * Canonical sources (no second source of truth):
 *   - Sales:     SUM(total_amount) WHERE status='completed' AND date=today
 *   - Stock:     products.current_stock / inventory_transactions ledger
 *   - Debts:     debts.amount - SUM(debt_payments.amount) — derived, never stored
 *
 * Reconciliation rules:
 *   - Sales total  = SUM(completed sales for today)  — verified against sales table
 *   - Stock balance = SUM(inventory_transactions.quantity)  — verifiable against ledger
 *   - Debt balance  = debts.amount - SUM(debt_payments)   — deterministic from ledger
 *
 * Sync replay invariance:
 *   All queries filter by completed status or use the confirmed payment ledger.
 *   Replaying a sync event that modifies the ledger does NOT change the
 *   already-computed totals for prior periods (sales are immutable once recorded;
 *   debt balance is recomputed from the ledger, which is append-only).
 */

import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { resolveActiveShopId } from '../database/active-shop'
import log from 'electron-log'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface DashboardSales {
  totalAmount: number
  count: number
  cashTotal: number
  mpesaTotal: number
  cardTotal: number
  debtTotal: number
}

export interface DashboardStock {
  totalProducts: number
  inStock: number
  lowStock: number
  outOfStock: number
  trackedProducts: number
}

export interface DashboardDebt {
  totalOutstanding: number
  count: number
  overdueCount: number
  collectedToday: number
}

export interface DashboardData {
  sales: DashboardSales
  stock: DashboardStock
  debt: DashboardDebt
  generatedAt: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns ISO date string for start of today in local Kenya time (UTC+3). */
function todayStart(): string {
  const now = new Date()
  const local = new Date(now.getTime() + (3 * 60 * 60 * 1000))
  return local.toISOString().slice(0, 10) + 'T00:00:00'
}

/** Returns ISO date string for end of today. */
function todayEnd(): string {
  const now = new Date()
  const local = new Date(now.getTime() + (3 * 60 * 60 * 1000))
  return local.toISOString().slice(0, 10) + 'T23:59:59'
}

// ── Query implementations ──────────────────────────────────────────────────────

function queryTodaySales(shopId: string): DashboardSales {
  const db = getDatabase()
  const start = todayStart()
  const end = todayEnd()

  const rows = db.prepare(`
    SELECT
      COALESCE(SUM(total_amount), 0) as total_amount,
      COUNT(*) as cnt,
      COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) as cash_total,
      COALESCE(SUM(CASE WHEN payment_method IN ('mpesa','mobile_money') THEN total_amount ELSE 0 END), 0) as mpesa_total,
      COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total_amount ELSE 0 END), 0) as card_total,
      COALESCE(SUM(CASE WHEN payment_method = 'debt' THEN total_amount ELSE 0 END), 0) as debt_total
    FROM sales
    WHERE shop_id = ?
      AND status = 'completed'
      AND created_at >= ?
      AND created_at <= ?
  `).get(shopId, start, end) as {
    total_amount: number; cnt: number
    cash_total: number; mpesa_total: number; card_total: number; debt_total: number
  }

  return {
    totalAmount: rows.total_amount,
    count: rows.cnt,
    cashTotal: rows.cash_total,
    mpesaTotal: rows.mpesa_total,
    cardTotal: rows.card_total,
    debtTotal: rows.debt_total,
  }
}

function queryStockHealth(shopId: string): DashboardStock {
  const db = getDatabase()

  const tracked = db.prepare(`
    SELECT COUNT(*) as cnt FROM products
    WHERE shop_id = ? AND is_active = 1 AND track_inventory = 1
  `).get(shopId) as { cnt: number }

  const outOfStock = db.prepare(`
    SELECT COUNT(*) as cnt FROM products
    WHERE shop_id = ? AND is_active = 1 AND track_inventory = 1 AND current_stock = 0
  `).get(shopId) as { cnt: number }

  const lowStock = db.prepare(`
    SELECT COUNT(*) as cnt FROM products
    WHERE shop_id = ? AND is_active = 1 AND track_inventory = 1
      AND current_stock > 0 AND current_stock <= low_stock_threshold
  `).get(shopId) as { cnt: number }

  const inStock = db.prepare(`
    SELECT COUNT(*) as cnt FROM products
    WHERE shop_id = ? AND is_active = 1 AND track_inventory = 1
      AND current_stock > low_stock_threshold
  `).get(shopId) as { cnt: number }

  return {
    totalProducts: tracked.cnt,
    trackedProducts: tracked.cnt,
    inStock: inStock.cnt,
    lowStock: lowStock.cnt,
    outOfStock: outOfStock.cnt,
  }
}

function queryDebtHealth(shopId: string): DashboardDebt {
  const db = getDatabase()
  const start = todayStart()
  const end = todayEnd()

  // Total outstanding: for each non-paid debt, balance = amount - SUM(payments)
  const debtRows = db.prepare(`
    SELECT d.id, d.amount, d.due_date
    FROM debts d
    WHERE d.shop_id = ? AND d.status != 'paid'
  `).all(shopId) as { id: string; amount: number; due_date: string | null }[]

  let totalOutstanding = 0
  let overdueCount = 0
  const now = new Date().toISOString().slice(0, 10)

  for (const row of debtRows) {
    const paidRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as paid FROM debt_payments WHERE debt_id = ?
    `).get(row.id) as { paid: number }
    const balance = row.amount - paidRow.paid
    totalOutstanding += balance
    if (row.due_date && row.due_date < now && balance > 0) {
      overdueCount++
    }
  }

  // Collected today: SUM of all debt payments recorded today
  const collectedRow = db.prepare(`
    SELECT COALESCE(SUM(p.amount), 0) as total
    FROM debt_payments p
    JOIN debts d ON p.debt_id = d.id
    WHERE d.shop_id = ? AND p.created_at >= ? AND p.created_at <= ?
  `).get(shopId, start, end) as { total: number }

  return {
    totalOutstanding,
    count: debtRows.length,
    overdueCount,
    collectedToday: collectedRow.total,
  }
}

// ── IPC registration ──────────────────────────────────────────────────────────

export function registerDashboardHandlers(): void {
  // ── Full dashboard (all three sections) ──────────────────────────────────
  ipcMain.handle('db:dashboard', async (): Promise<DashboardData> => {
    const shopId = await resolveActiveShopId()
    const [sales, stock, debt] = await Promise.all([
      Promise.resolve(queryTodaySales(shopId)),
      Promise.resolve(queryStockHealth(shopId)),
      Promise.resolve(queryDebtHealth(shopId)),
    ])
    return {
      sales,
      stock,
      debt,
      generatedAt: new Date().toISOString(),
    }
  })

  // ── Sales only (for POS header refresh without pulling stock/debt) ─────────
  ipcMain.handle('db:dashboard:sales', async (): Promise<DashboardSales> => {
    const shopId = await resolveActiveShopId()
    return queryTodaySales(shopId)
  })

  // ── Stock only ──────────────────────────────────────────────────────────────
  ipcMain.handle('db:dashboard:stock', async (): Promise<DashboardStock> => {
    const shopId = await resolveActiveShopId()
    return queryStockHealth(shopId)
  })

  // ── Debt only ──────────────────────────────────────────────────────────────
  ipcMain.handle('db:dashboard:debt', async (): Promise<DashboardDebt> => {
    const shopId = await resolveActiveShopId()
    return queryDebtHealth(shopId)
  })

  log.info('Dashboard IPC handlers registered (Phase 12)')
}
