/**
 * PartnerWidget.tsx — Phase 18: commission.view_own widget on the dashboard.
 *
 * Shows for any logged-in user with commission.view_own capability:
 *   - Enrolled businesses count (active/total)
 *   - Recent earnings (last 30 days)
 *   - All-time earnings
 *
 * For salesperson role specifically, also shows:
 *   - Active enrolled businesses breakdown
 *
 * Business logic: all commission totals computed by SDK; this component
 * is display-only. No recalculation in this component.
 */

import React from 'react'
import { TrendingUp, RefreshCw, AlertCircle, Building2, Users } from 'lucide-react'
import { usePartnerCommission, useIsSalesperson } from '../../hooks/usePartnerCommission'
import { formatCurrency } from '../../lib/formatting-currency'

interface PartnerWidgetProps {
  className?: string
}

export function PartnerWidget({ className = '' }: PartnerWidgetProps) {
  const isSalesperson = useIsSalesperson()
  const {
    loading,
    error,
    enrolledCount,
    activeCount,
    totalEarnings,
    recentEarnings,
    refetch,
  } = usePartnerCommission()

  // Only show for salesperson users with data
  if (!isSalesperson) return null
  if (!loading && enrolledCount === 0 && !error) return null

  return (
    <div className={`rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-900/30">
            <TrendingUp size={14} className="text-orange-500" />
          </div>
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">
            Partner Earnings
          </h2>
        </div>
        <button
          onClick={refetch}
          disabled={loading}
          className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <AlertCircle size={12} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        </div>
      ) : (
        <>
          {/* Earnings summary */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-0.5">
                Recent (30d)
              </p>
              <p className="text-base font-black text-emerald-700 dark:text-emerald-300 tabular-nums">
                {formatCurrency(recentEarnings)}
              </p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-0.5">
                All Time
              </p>
              <p className="text-base font-black text-blue-700 dark:text-blue-300 tabular-nums">
                {formatCurrency(totalEarnings)}
              </p>
            </div>
          </div>

          {/* Enrolled businesses */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Building2 size={12} className="text-slate-400" />
              <span className="text-[10px] text-slate-500">Enrolled</span>
            </div>
            <div className="flex items-center gap-1">
              <Users size={12} className="text-green-500" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {activeCount}
              </span>
              <span className="text-[10px] text-slate-400">active</span>
            </div>
            <span className="text-[10px] text-slate-300 dark:text-slate-600">/</span>
            <span className="text-xs font-medium text-slate-500">
              {enrolledCount} total
            </span>
          </div>
        </>
      )}
    </div>
  )
}
