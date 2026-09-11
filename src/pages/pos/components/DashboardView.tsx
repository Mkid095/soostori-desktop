/**
 * DashboardView.tsx — Phase 12: Fast operational dashboard for POS.
 *
 * Layout: Compact horizontal strip with 3 sections — Sales | Stock | Debt.
 * Each section shows the most actionable KPIs at a glance.
 *
 * Refresh: every 30s (matches staleTime in useDashboard).
 * Speed: single-shot SQLite queries, no sync, no aggregation.
 * Canonical: derived from sales table, products table, debts+debt_payments ledger.
 */

import React from 'react'
import { TrendingUp, Package, AlertTriangle, CheckCircle, XCircle, CreditCard, RefreshCw } from 'lucide-react'
import { useDashboard } from '../../../hooks/useDashboard'
import { formatCurrency } from '../../../lib/formatting-currency'
import { useTranslation } from '../../../lib/useTranslation'

// ── Sub-components ────────────────────────────────────────────────────────────

interface MiniStatProps {
  label: string
  value: string
  sub?: string
  accent: 'default' | 'green' | 'amber' | 'red'
  icon: React.ReactNode
}

const MiniStat: React.FC<MiniStatProps> = ({ label, value, sub, accent, icon }) => {
  const accentClasses = {
    default: 'text-slate-700 dark:text-slate-200',
    green: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    red: 'text-red-600 dark:text-red-400',
  }
  return (
    <div className="flex items-center gap-2">
      <div className={`shrink-0 ${accentClasses[accent]}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 whitespace-nowrap">{label}</p>
        <p className={`text-sm font-black tabular-nums truncate ${accentClasses[accent]}`}>{value}</p>
        {sub && <p className="text-[9px] text-slate-400 whitespace-nowrap">{sub}</p>}
      </div>
    </div>
  )
}

interface SectionProps {
  title: string
  children: React.ReactNode
  loading: boolean
}

const Section: React.FC<SectionProps> = ({ title, children, loading }) => (
  <div className="flex flex-col gap-2 px-3 py-2 min-w-0">
    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{title}</p>
    {loading ? (
      <div className="flex items-center gap-1 text-slate-400">
        <RefreshCw size={10} className="animate-spin" />
        <span className="text-[10px]">...</span>
      </div>
    ) : children}
  </div>
)

const Divider: React.FC = () => (
  <div className="w-px bg-slate-200 dark:bg-slate-700 mx-1 self-stretch" />
)

// ── Main component ────────────────────────────────────────────────────────────

interface DashboardViewProps {
  /** Collapse the dashboard to a single line (default: false) */
  compact?: boolean
}

const DashboardView: React.FC<DashboardViewProps> = ({ compact = false }) => {
  const { t } = useTranslation()
  const { data, isLoading, dataUpdatedAt } = useDashboard()

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
    : null

  if (!data && !isLoading) {
    return (
      <div className="flex items-center justify-center h-12 text-xs text-slate-400">
        Dashboard unavailable
      </div>
    )
  }

  const { sales, stock, debt } = data ?? {
    sales: { totalAmount: 0, count: 0, cashTotal: 0, mpesaTotal: 0, cardTotal: 0, debtTotal: 0 },
    stock: { totalProducts: 0, inStock: 0, lowStock: 0, outOfStock: 0, trackedProducts: 0 },
    debt: { totalOutstanding: 0, count: 0, overdueCount: 0, collectedToday: 0 },
  }

  if (compact) {
    return (
      <div className="flex items-center gap-4 px-4 py-1.5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
        {/* Sales */}
        <MiniStat
          label="TODAY"
          value={formatCurrency(sales.totalAmount)}
          sub={`${sales.count} tx`}
          accent="default"
          icon={<TrendingUp size={12} />}
        />
        <Divider />
        {/* Stock */}
        <MiniStat
          label="IN STOCK"
          value={String(stock.inStock)}
          sub={stock.lowStock > 0 ? `${stock.lowStock} low` : undefined}
          accent={stock.lowStock > 0 ? 'amber' : 'green'}
          icon={<Package size={12} />}
        />
        {stock.outOfStock > 0 && (
          <>
            <Divider />
            <MiniStat
              label="OUT"
              value={String(stock.outOfStock)}
              sub="out of stock"
              accent="red"
              icon={<XCircle size={12} />}
            />
          </>
        )}
        <Divider />
        {/* Debt */}
        <MiniStat
          label="DEBT"
          value={formatCurrency(debt.totalOutstanding)}
          sub={debt.overdueCount > 0 ? `${debt.overdueCount} overdue` : undefined}
          accent={debt.overdueCount > 0 ? 'red' : 'default'}
          icon={<CreditCard size={12} />}
        />
        {debt.collectedToday > 0 && (
          <>
            <Divider />
            <MiniStat
              label="RECOVERED"
              value={formatCurrency(debt.collectedToday)}
              accent="green"
              icon={<CheckCircle size={12} />}
            />
          </>
        )}
        {lastUpdated && (
          <span className="ml-auto text-[9px] text-slate-300 dark:text-slate-600 shrink-0">{lastUpdated}</span>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
      <div className="flex overflow-x-auto">
        {/* ── Sales section ──────────────────────────────────────── */}
        <Section title="Today's Sales" loading={isLoading}>
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-slate-800 dark:text-slate-100 tabular-nums">
                {formatCurrency(sales.totalAmount)}
              </span>
              <span className="text-xs text-slate-400">{sales.count} transactions</span>
            </div>
            <div className="flex gap-3">
              {sales.cashTotal > 0 && (
                <span className="text-[10px] font-bold text-emerald-600">Cash {formatCurrency(sales.cashTotal)}</span>
              )}
              {sales.mpesaTotal > 0 && (
                <span className="text-[10px] font-bold text-green-600">M-Pesa {formatCurrency(sales.mpesaTotal)}</span>
              )}
              {sales.cardTotal > 0 && (
                <span className="text-[10px] font-bold text-blue-600">Card {formatCurrency(sales.cardTotal)}</span>
              )}
              {sales.debtTotal > 0 && (
                <span className="text-[10px] font-bold text-amber-600">Debt {formatCurrency(sales.debtTotal)}</span>
              )}
            </div>
          </div>
        </Section>

        <Divider />

        {/* ── Stock section ─────────────────────────────────────── */}
        <Section title="Stock" loading={isLoading}>
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <CheckCircle size={11} className="text-emerald-500" />
                <span className="text-sm font-black text-slate-700 dark:text-slate-200">{stock.inStock}</span>
                <span className="text-[10px] text-slate-400">in stock</span>
              </div>
              <div className="flex items-center gap-1.5">
                <AlertTriangle size={11} className="text-amber-500" />
                <span className="text-sm font-black text-amber-600">{stock.lowStock}</span>
                <span className="text-[10px] text-slate-400">low stock</span>
              </div>
              <div className="flex items-center gap-1.5">
                <XCircle size={11} className="text-red-400" />
                <span className="text-sm font-black text-red-500">{stock.outOfStock}</span>
                <span className="text-[10px] text-slate-400">out of stock</span>
              </div>
            </div>
          </div>
        </Section>

        <Divider />

        {/* ── Debt section ───────────────────────────────────────── */}
        <Section title="Customer Debt" loading={isLoading}>
          <div className="flex flex-col gap-2">
            <div>
              <span className="text-xl font-black text-slate-800 dark:text-slate-100 tabular-nums">
                {formatCurrency(debt.totalOutstanding)}
              </span>
              <span className="ml-1.5 text-xs text-slate-400">{debt.count} open</span>
            </div>
            {debt.overdueCount > 0 && (
              <div className="flex items-center gap-1">
                <AlertTriangle size={10} className="text-red-500" />
                <span className="text-[10px] font-bold text-red-600">{debt.overdueCount} overdue</span>
              </div>
            )}
            {debt.collectedToday > 0 && (
              <div className="flex items-center gap-1">
                <CheckCircle size={10} className="text-emerald-500" />
                <span className="text-[10px] font-bold text-emerald-600">
                  +{formatCurrency(debt.collectedToday)} recovered today
                </span>
              </div>
            )}
          </div>
        </Section>

        {lastUpdated && (
          <div className="ml-auto flex items-center px-3 self-center">
            <span className="text-[9px] text-slate-300 dark:text-slate-600">
              Updated {lastUpdated}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardView
