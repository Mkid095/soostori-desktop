/**
 * useDashboard.ts — Phase 12: Fast operational dashboard for POS.
 *
 * Canonical sources:
 *   - Sales:     sales table (completed only), SUM for today
 *   - Stock:     products table (tracked, active)
 *   - Debts:     debts.amount - SUM(debt_payments) — derived, not stored
 *
 * Sync invariance: all queries use immutable completed rows.
 * Reconciliation: SUM(completed sales) = displayed total;
 *                 SUM(stock ledger) = displayed stock;
 *                 debt balance = derived from payment ledger.
 */

import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

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

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useDashboard() {
  return useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const data = await api.getDashboard() as DashboardData
      return data
    },
    staleTime: 30_000,        // consider fresh for 30s (fast local SQLite)
    refetchInterval: 30_000,  // refresh every 30s so POS sees live data
  })
}

export function useDashboardSales() {
  return useQuery<DashboardSales>({
    queryKey: ['dashboard', 'sales'],
    queryFn: () => api.getDashboardSales() as Promise<DashboardSales>,
    staleTime: 15_000,
    refetchInterval: 15_000,
  })
}

export function useDashboardStock() {
  return useQuery<DashboardStock>({
    queryKey: ['dashboard', 'stock'],
    queryFn: () => api.getDashboardStock() as Promise<DashboardStock>,
    staleTime: 60_000,
    refetchInterval: 60_000,
  })
}

export function useDashboardDebt() {
  return useQuery<DashboardDebt>({
    queryKey: ['dashboard', 'debt'],
    queryFn: () => api.getDashboardDebt() as Promise<DashboardDebt>,
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
}
