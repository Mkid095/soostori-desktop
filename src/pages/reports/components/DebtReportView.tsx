/**
 * DebtReportView.tsx — Phase 13: Debt report.
 *
 * Shows: aging buckets (0-30 / 31-60 / 61-90 / 90+ days),
 * outstanding by customer, overdue highlighted.
 */

import React from 'react'
import { DollarSign, AlertTriangle, Clock, RefreshCw } from 'lucide-react'
import { useDebtReport } from '../../../hooks/useReports'
import { formatCurrency } from '../../../lib/formatting-currency'
import { useTranslation } from '../../../lib/useTranslation'

export const DebtReportView: React.FC = () => {
  const { t } = useTranslation()
  const { data: report, isLoading } = useDebtReport()

  if (isLoading) {
    return <div className="flex justify-center py-20"><RefreshCw className="animate-spin text-brand-orange" /></div>
  }

  if (!report) return null

  const agingBucketEntries = Object.entries(report.agingBuckets) as [string, number][]

  return (
    <div className="space-y-4 p-4">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-amber-100 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 px-4 py-3">
          <p className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 mb-1">Total Outstanding</p>
          <p className="text-xl font-black text-amber-700 dark:text-amber-300">{formatCurrency(report.totalOutstanding)}</p>
        </div>
        <div className="rounded-2xl border border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3">
          <p className="text-[10px] font-bold uppercase text-red-600 dark:text-red-400 mb-1">Overdue</p>
          <p className="text-xl font-black text-red-700 dark:text-red-300">{report.overdueCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3">
          <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Partial Payments</p>
          <p className="text-xl font-black text-slate-700 dark:text-slate-300">{report.partialCount}</p>
        </div>
      </div>

      {/* Aging Buckets */}
      <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={14} className="text-brand-orange" />
          <h3 className="text-xs font-black uppercase text-slate-500">Debt Aging</h3>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {agingBucketEntries.map(([bucket, amount]) => {
            const isOverdue = bucket === '61-90' || bucket === '90+'
            return (
              <div
                key={bucket}
                className={`rounded-xl px-3 py-2 ${isOverdue ? 'bg-red-50 dark:bg-red-950/40' : 'bg-slate-50 dark:bg-slate-800/60'}`}
              >
                <p className={`text-[10px] font-bold uppercase mb-0.5 ${isOverdue ? 'text-red-500' : 'text-slate-400'}`}>{bucket} days</p>
                <p className={`text-sm font-black tabular-nums ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}`}>
                  {formatCurrency(amount)}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* By Customer */}
      <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign size={14} className="text-brand-orange" />
          <h3 className="text-xs font-black uppercase text-slate-500">Outstanding by Customer</h3>
        </div>
        {report.byCustomer.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">No outstanding debts</p>
        ) : (
          <div className="space-y-1.5">
            {report.byCustomer.map(item => (
              <div key={item.customerId} className="flex items-center justify-between py-1.5 border-b border-slate-50 dark:border-slate-800 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{item.name}</p>
                  <p className="text-[10px] text-slate-400">{item.debtCount} debt{item.debtCount !== 1 ? 's' : ''}</p>
                </div>
                <span className="text-xs font-black tabular-nums text-amber-600">{formatCurrency(item.outstanding)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
