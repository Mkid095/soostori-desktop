/**
 * useReports.ts — Phase 13: Report data hooks.
 *
 * All hooks are read-only — they call the IPC bridge for report data.
 */

import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

// ── Types ──────────────────────────────────────────────────────────────────────

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

export interface InventoryReport {
  totalProducts: number
  totalStockValue: number
  lowStockCount: number
  outOfStockCount: number
  deadStock: Array<{ productId: string; name: string; lastMovementDate: string }>
  reorderSuggestions: Array<{ productId: string; name: string; currentStock: number; threshold: number; suggestedOrder: number }>
}

export interface DebtReport {
  totalOutstanding: number
  overdueCount: number
  partialCount: number
  agingBuckets: { '0-30': number; '31-60': number; '61-90': number; '90+': number }
  byCustomer: Array<{ customerId: string; name: string; outstanding: number; debtCount: number }>
}

export interface ExpenseReport {
  total: number
  byCategory: Record<string, number>
  pendingCount: number
  vsPriorMonth: number
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useDashboardSummary() {
  return useQuery<DashboardSummary>({
    queryKey: ['reports', 'dashboardSummary'],
    queryFn: () => api.getDashboardSummary() as Promise<DashboardSummary>,
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
}

export function useSalesReport(from: string, to: string) {
  return useQuery<SalesReport>({
    queryKey: ['reports', 'sales', from, to],
    queryFn: () => api.getSalesReport(from, to) as Promise<SalesReport>,
    staleTime: 60_000,
    enabled: !!from && !!to,
  })
}

export function useInventoryReport() {
  return useQuery<InventoryReport>({
    queryKey: ['reports', 'inventory'],
    queryFn: () => api.getInventoryReport() as Promise<InventoryReport>,
    staleTime: 60_000,
    refetchInterval: 60_000,
  })
}

export function useDebtReport() {
  return useQuery<DebtReport>({
    queryKey: ['reports', 'debt'],
    queryFn: () => api.getDebtReport() as Promise<DebtReport>,
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
}

export function useExpenseReport(month: string) {
  return useQuery<ExpenseReport>({
    queryKey: ['reports', 'expense', month],
    queryFn: () => api.getExpenseReport(month) as Promise<ExpenseReport>,
    staleTime: 60_000,
    enabled: !!month,
  })
}
