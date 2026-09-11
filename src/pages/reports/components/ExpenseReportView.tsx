/**
 * ExpenseReportView.tsx — Phase 13: Expense report.
 *
 * Shows: monthly breakdown by category, prior month comparison.
 */

import React, { useState } from 'react'
import { Receipt, TrendingUp, TrendingDown, RefreshCw, Minus } from 'lucide-react'
import { useExpenseReport } from '../../../hooks/useReports'
import { formatCurrency } from '../../../lib/formatting-currency'
import { useTranslation } from '../../../lib/useTranslation'

export const ExpenseReportView: React.FC = () => {
  const { t } = useTranslation()
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  )

  const { data: report, isLoading } = useExpenseReport(selectedMonth)

  const prevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const d = new Date(y, m - 2, 1)
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const nextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const d = new Date(y, m, 1)
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const categoryColors: Record<string, string> = {
    rent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    utilities: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    transport: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    supplies: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    salaries: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    other: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  }

  if (isLoading) {
    return <div className="flex justify-center py-20"><RefreshCw className="animate-spin text-brand-orange" /></div>
  }

  const report_data = report

  return (
    <div className="space-y-4 p-4">
      {/* Month Filter */}
      <div className="flex items-center gap-2">
        <button onClick={prevMonth} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-500 text-sm">‹</button>
        <input
          type="month"
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-brand-orange transition-colors"
        />
        <button onClick={nextMonth} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-500 text-sm">›</button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3">
          <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Total This Month</p>
          <p className="text-xl font-black text-slate-800 dark:text-slate-100">{formatCurrency(report_data?.total ?? 0)}</p>
        </div>
        <div className="rounded-2xl border border-amber-100 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 px-4 py-3">
          <p className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 mb-1">Pending</p>
          <p className="text-xl font-black text-amber-700 dark:text-amber-300">{report_data?.pendingCount ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3">
          <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">vs Prior Month</p>
          {report_data && (
            <div className="flex items-center gap-1">
              {report_data.vsPriorMonth > 0 ? (
                <TrendingUp size={14} className="text-red-500" />
              ) : report_data.vsPriorMonth < 0 ? (
                <TrendingDown size={14} className="text-emerald-500" />
              ) : (
                <Minus size={14} className="text-slate-400" />
              )}
              <p className={`text-xl font-black ${report_data.vsPriorMonth > 0 ? 'text-red-600' : report_data.vsPriorMonth < 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                {Math.abs(report_data.vsPriorMonth)}%
              </p>
            </div>
          )}
        </div>
      </div>

      {/* By Category */}
      <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Receipt size={14} className="text-brand-orange" />
          <h3 className="text-xs font-black uppercase text-slate-500">By Category</h3>
        </div>
        {report_data && Object.keys(report_data.byCategory).length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">No expenses recorded this month</p>
        ) : (
          <div className="space-y-2">
            {report_data?.byCategory && Object.entries(report_data.byCategory)
              .sort(([, a], [, b]) => b - a)
              .map(([cat, amount]) => (
                <div key={cat} className="flex items-center justify-between py-1.5 border-b border-slate-50 dark:border-slate-800 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${categoryColors[cat] ?? categoryColors.other}`}>
                      {t(`exp.cat.${cat}`, cat)}
                    </span>
                  </div>
                  <span className="text-xs font-black tabular-nums text-slate-700 dark:text-slate-200">{formatCurrency(amount)}</span>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  )
}
