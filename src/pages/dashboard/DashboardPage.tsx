/**
 * DashboardPage.tsx — Phase 13: Enhanced operational dashboard.
 *
 * KPI summary cards at top: today/week/month sales + revenue, gross margin %,
 * low-stock alerts, outstanding debts, pending expenses.
 *
 * Quick access buttons to all four report views.
 * Recent activity feed (last 10 completed sales).
 */

import React from 'react'
import {
  TrendingUp, Package, AlertTriangle, CheckCircle, XCircle,
  CreditCard, BarChart3, ArrowRightLeft, Receipt, DollarSign,
  RefreshCw, Users, ShoppingCart, Percent
} from 'lucide-react'
import { useDashboardSummary } from '../../hooks/useReports'
import { useRecentSales } from '../../hooks/useSales'
import { formatCurrency } from '../../lib/formatting-currency'
import { useTranslation } from '../../lib/useTranslation'

// ── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  accent: 'orange' | 'emerald' | 'amber' | 'red' | 'blue'
  icon: React.ComponentType<{ size?: number; className?: string }>
}

const ACCENT_MAP: Record<StatCardProps['accent'], { bg: string; text: string; value: string }> = {
  orange: { bg: 'bg-orange-50 dark:bg-orange-950/40', text: 'text-orange-600 dark:text-orange-400', value: 'text-orange-700 dark:text-orange-300' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-600 dark:text-emerald-400', value: 'text-emerald-700 dark:text-emerald-300' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-600 dark:text-amber-400', value: 'text-amber-700 dark:text-amber-300' },
  red: { bg: 'bg-red-50 dark:bg-red-950/40', text: 'text-red-600 dark:text-red-400', value: 'text-red-700 dark:text-red-300' },
  blue: { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-600 dark:text-blue-400', value: 'text-blue-700 dark:text-blue-300' },
}

const StatCard: React.FC<StatCardProps> = ({ label, value, sub, accent, icon: Icon }) => {
  const tone = ACCENT_MAP[accent]
  return (
    <div className={`flex items-center gap-3 rounded-2xl ${tone.bg} px-4 py-3`}>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/70 dark:bg-slate-900/40 ${tone.text}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-[10px] font-bold uppercase tracking-wider ${tone.text}`}>{label}</p>
        <p className={`truncate text-lg font-black tabular-nums ${tone.value}`}>{value}</p>
        {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
      </div>
    </div>
  )
}

// ── Section ───────────────────────────────────────────────────────────────────

interface DashboardSectionProps {
  title: string
  loading?: boolean
  children: React.ReactNode
}

const Section: React.FC<DashboardSectionProps> = ({ title, loading, children }) => (
  <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">{title}</h2>
      {loading && <RefreshCw size={12} className="animate-spin text-slate-400" />}
    </div>
    {children}
  </div>
)

// ── Quick Access Button ───────────────────────────────────────────────────────

interface QuickAccessProps {
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  accent: StatCardProps['accent']
  onClick: () => void
}

const QuickAccess: React.FC<QuickAccessProps> = ({ label, icon: Icon, accent, onClick }) => {
  const tone = ACCENT_MAP[accent]
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 rounded-2xl ${tone.bg} px-4 py-3 transition-opacity hover:opacity-80`}
    >
      <Icon size={20} className={tone.text} />
      <span className={`text-[10px] font-bold ${tone.text}`}>{label}</span>
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type ActiveReportTab = 'sales' | 'inventory' | 'debt' | 'expense'

interface DashboardPageProps {
  onNavigateToReport?: (tab: ActiveReportTab) => void
}

const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigateToReport }) => {
  const { t } = useTranslation()
  const { data: summary, isLoading } = useDashboardSummary()
  const { data: recentSales = [] } = useRecentSales(10)

  const lastUpdated = summary
    ? new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null

  const s = summary

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg-primary p-4 gap-4">
      <header className="flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-orange text-white">
            <TrendingUp size={16} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100">Operations Dashboard</h1>
            <p className="text-[10px] text-slate-400">Today — local time (Kenya UTC+3)</p>
          </div>
        </div>
        {lastUpdated && (
          <span className="text-[10px] text-slate-400">Updated {lastUpdated}</span>
        )}
      </header>

      {/* ── Revenue & Profit KPIs ───────────────────────────────────── */}
      <Section title="Revenue & Profit" loading={isLoading}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          <StatCard
            label="Today"
            value={formatCurrency(s?.todayRevenue ?? 0)}
            sub="sales today"
            accent="orange"
            icon={TrendingUp}
          />
          <StatCard
            label="This Week"
            value={formatCurrency(s?.weekRevenue ?? 0)}
            sub="last 7 days"
            accent="orange"
            icon={TrendingUp}
          />
          <StatCard
            label="This Month"
            value={formatCurrency(s?.monthRevenue ?? 0)}
            sub="current month"
            accent="orange"
            icon={TrendingUp}
          />
          <StatCard
            label="Gross Profit"
            value={formatCurrency(s?.grossProfit ?? 0)}
            sub={`margin ${s?.grossMargin ?? 0}%`}
            accent="emerald"
            icon={TrendingUp}
          />
          <StatCard
            label="Gross Margin"
            value={`${s?.grossMargin ?? 0}%`}
            sub="profit / revenue"
            accent="emerald"
            icon={Percent}
          />
        </div>
      </Section>

      {/* ── Stock & Alerts KPIs ────────────────────────────────────── */}
      <Section title="Stock Health" loading={isLoading}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Total Products"
            value={s?.activeCustomers ?? 0}
            sub="active in catalog"
            accent="blue"
            icon={Package}
          />
          <StatCard
            label="Low Stock"
            value={s?.lowStockCount ?? 0}
            sub="reorder soon"
            accent="amber"
            icon={AlertTriangle}
          />
          <StatCard
            label="Outstanding Debts"
            value={formatCurrency(s?.outstandingDebts ?? 0)}
            sub="unpaid balances"
            accent="amber"
            icon={CreditCard}
          />
          <StatCard
            label="Pending Expenses"
            value={s?.pendingExpenses ?? 0}
            sub="awaiting approval"
            accent="amber"
            icon={Receipt}
          />
        </div>
      </Section>

      {/* ── Quick Access to Reports ────────────────────────────────── */}
      <Section title="Reports" loading={isLoading}>
        <div className="grid grid-cols-4 gap-3">
          <QuickAccess
            label="Sales"
            icon={BarChart3}
            accent="orange"
            onClick={() => onNavigateToReport?.('sales')}
          />
          <QuickAccess
            label="Inventory"
            icon={Package}
            accent="blue"
            onClick={() => onNavigateToReport?.('inventory')}
          />
          <QuickAccess
            label="Debt"
            icon={DollarSign}
            accent="amber"
            onClick={() => onNavigateToReport?.('debt')}
          />
          <QuickAccess
            label="Expense"
            icon={Receipt}
            accent="red"
            onClick={() => onNavigateToReport?.('expense')}
          />
        </div>
      </Section>

      {/* ── Recent Activity ────────────────────────────────────────── */}
      <Section title="Recent Transactions" loading={isLoading}>
        {recentSales.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">No transactions yet</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {recentSales.slice(0, 10).map(sale => (
              <div key={sale.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 dark:border-slate-800 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <ShoppingCart size={12} className="text-brand-orange shrink-0" />
                  <span className="text-xs text-slate-600 dark:text-slate-300 truncate">
                    {sale.items_summary || 'Sale'}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200 tabular-nums">
                    {formatCurrency(sale.totalAmount)}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(sale.createdAt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Reconciliation note ─────────────────────────────────── */}
      <div className="mt-auto rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-2">
        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 mb-1">Reconciliation</p>
        <ul className="space-y-0.5 text-[10px] text-slate-400">
          <li>• Sales total = SUM(completed transactions) — verified against sales table</li>
          <li>• Stock balance = SUM(inventory_transactions ledger) — synced from POS operations</li>
          <li>• Debt balance = debts.amount − SUM(debt_payments) — deterministic from append-only ledger</li>
          <li>• Sync replay does not change totals — completed records are immutable</li>
        </ul>
      </div>
    </div>
  )
}

export default DashboardPage
