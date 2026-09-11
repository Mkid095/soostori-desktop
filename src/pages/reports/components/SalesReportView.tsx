/**
 * SalesReportView.tsx — Phase 13: Sales report view.
 *
 * Shows: date range selection, payment method breakdown, top products, profit summary.
 * Embedded in the Reports page as a tab.
 */

import React, { useState } from 'react'
import { BarChart3, TrendingUp, RefreshCw } from 'lucide-react'
import { useSalesReport } from '../../../hooks/useReports'
import { formatCurrency } from '../../../lib/formatting-currency'
import { useTranslation } from '../../../lib/useTranslation'
import { DateFilter, PaymentFilter } from '../hooks/useReportsState'

const todayIso = () => new Date().toISOString().slice(0, 10)
const monthAgoIso = () => {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().slice(0, 10)
}

const dateFilterToRange = (filter: DateFilter): { from: string; to: string } => {
  const today = todayIso()
  const now = new Date()
  if (filter === 'today') return { from: today, to: today }
  if (filter === 'week') {
    const d = new Date(now.getTime() - 7 * 86400000)
    return { from: d.toISOString().slice(0, 10), to: today }
  }
  if (filter === 'month') {
    const d = new Date(now.getFullYear(), now.getMonth(), 1)
    return { from: d.toISOString().slice(0, 10), to: today }
  }
  return { from: monthAgoIso(), to: today }
}

export const SalesReportView: React.FC = () => {
  const { t } = useTranslation()
  const [dateFilter, setDateFilter] = useState<DateFilter>('month')
  const [customRange, setCustomRange] = useState({ from: monthAgoIso(), to: todayIso() })

  const range = dateFilter === 'custom' ? customRange : dateFilterToRange(dateFilter)

  const { data: report, isLoading } = useSalesReport(range.from, range.to)

  const handleCustomFrom = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomRange(r => ({ ...r, from: e.target.value }))
    setDateFilter('custom')
  }

  const handleCustomTo = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomRange(r => ({ ...r, to: e.target.value }))
    setDateFilter('custom')
  }

  const formatDate = (d: string) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : ''

  if (isLoading) {
    return <div className="flex justify-center py-20"><RefreshCw className="animate-spin text-brand-orange" /></div>
  }

  const r = report

  const paymentMethods = r ? Object.entries(r.byPaymentMethod).filter(([, v]) => v.count > 0) : []

  return (
    <div className="space-y-4 p-4">
      {/* Date Range Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['today', 'week', 'month', 'custom'] as DateFilter[]).map(f => (
          <button
            key={f}
            onClick={() => setDateFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              dateFilter === f
                ? 'bg-brand-orange text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {f === 'today' ? 'Today' : f === 'week' ? 'This Week' : f === 'month' ? 'This Month' : 'Custom'}
          </button>
        ))}
        {dateFilter === 'custom' && (
          <div className="flex items-center gap-2 ml-auto">
            <input type="date" value={customRange.from} onChange={handleCustomFrom}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 px-2 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none" />
            <span className="text-slate-400 text-xs">–</span>
            <input type="date" value={customRange.to} onChange={handleCustomTo}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 px-2 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none" />
          </div>
        )}
      </div>

      {r && (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3">
              <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Total Revenue</p>
              <p className="text-lg font-black text-slate-800 dark:text-slate-100">{formatCurrency(r.totalRevenue)}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3">
              <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Gross Profit</p>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(r.grossProfit)}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3">
              <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Margin</p>
              <p className="text-lg font-black text-slate-800 dark:text-slate-100">{r.grossMargin}%</p>
            </div>
            <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3">
              <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Transactions</p>
              <p className="text-lg font-black text-slate-800 dark:text-slate-100">{r.salesCount}</p>
            </div>
          </div>

          {/* Cost breakdown */}
          <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3">
            <div className="flex items-center gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px]">Total Cost: </span>
                <span className="font-black text-slate-700 dark:text-slate-200">{formatCurrency(r.totalCost)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px]">Avg Sale: </span>
                <span className="font-black text-slate-700 dark:text-slate-200">{formatCurrency(r.averageSaleValue)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px]">Period: </span>
                <span className="font-black text-slate-700 dark:text-slate-200">{formatDate(r.period.from)} – {formatDate(r.period.to)}</span>
              </div>
            </div>
          </div>

          {/* Payment Method Breakdown */}
          <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 size={14} className="text-brand-orange" />
              <h3 className="text-xs font-black uppercase text-slate-500">By Payment Method</h3>
            </div>
            <div className="space-y-2">
              {paymentMethods.map(([method, data]) => (
                <div key={method} className="flex items-center gap-3">
                  <div className="w-20 text-xs font-semibold text-slate-600 dark:text-slate-300 capitalize">{method}</div>
                  <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                    <div
                      className="bg-brand-orange h-2 rounded-full transition-all"
                      style={{ width: `${r.totalSales > 0 ? (data.amount / r.totalSales) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="w-24 text-right">
                    <span className="text-xs font-black text-slate-700 dark:text-slate-200">{formatCurrency(data.amount)}</span>
                    <span className="text-[10px] text-slate-400 ml-1">({data.count})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Products */}
          {r.topProducts.length > 0 && (
            <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={14} className="text-brand-orange" />
                <h3 className="text-xs font-black uppercase text-slate-500">Top Products</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700">
                      <th className="text-left py-1.5 text-[10px] font-bold text-slate-400 uppercase">#</th>
                      <th className="text-left py-1.5 text-[10px] font-bold text-slate-400 uppercase">Product</th>
                      <th className="text-right py-1.5 text-[10px] font-bold text-slate-400 uppercase">Qty Sold</th>
                      <th className="text-right py-1.5 text-[10px] font-bold text-slate-400 uppercase">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.topProducts.map((p, i) => (
                      <tr key={p.productId || i} className="border-b border-slate-50 dark:border-slate-800/60 last:border-0">
                        <td className="py-1.5 text-slate-400">{i + 1}</td>
                        <td className="py-1.5 text-slate-700 dark:text-slate-200 font-semibold truncate max-w-[160px]">{p.name}</td>
                        <td className="py-1.5 text-right tabular-nums text-slate-600">{p.quantitySold}</td>
                        <td className="py-1.5 text-right font-black tabular-nums text-slate-800 dark:text-slate-100">{formatCurrency(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
