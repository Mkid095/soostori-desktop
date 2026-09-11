/**
 * InventoryReportView.tsx — Phase 13: Inventory report.
 *
 * Shows: stock valuation total, dead stock list, reorder suggestions.
 */

import React from 'react'
import { Package, AlertTriangle, XCircle, RefreshCw, TrendingDown } from 'lucide-react'
import { useInventoryReport } from '../../../hooks/useReports'
import { formatCurrency } from '../../../lib/formatting-currency'
import { useTranslation } from '../../../lib/useTranslation'

export const InventoryReportView: React.FC = () => {
  const { t } = useTranslation()
  const { data: report, isLoading } = useInventoryReport()

  if (isLoading) {
    return <div className="flex justify-center py-20"><RefreshCw className="animate-spin text-brand-orange" /></div>
  }

  if (!report) return null

  return (
    <div className="space-y-4 p-4">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3">
          <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Total Products</p>
          <p className="text-xl font-black text-slate-800 dark:text-slate-100">{report.totalProducts}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3">
          <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Stock Value</p>
          <p className="text-xl font-black text-slate-800 dark:text-slate-100">{formatCurrency(report.totalStockValue)}</p>
        </div>
        <div className="rounded-2xl border border-amber-100 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 px-4 py-3">
          <p className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 mb-1">Low Stock</p>
          <p className="text-xl font-black text-amber-700 dark:text-amber-300">{report.lowStockCount}</p>
        </div>
        <div className="rounded-2xl border border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3">
          <p className="text-[10px] font-bold uppercase text-red-600 dark:text-red-400 mb-1">Out of Stock</p>
          <p className="text-xl font-black text-red-700 dark:text-red-300">{report.outOfStockCount}</p>
        </div>
      </div>

      {/* Dead Stock */}
      <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingDown size={14} className="text-red-500" />
          <h3 className="text-xs font-black uppercase text-slate-500">Dead Stock (no movement &gt;30 days)</h3>
        </div>
        {report.deadStock.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">No dead stock detected</p>
        ) : (
          <div className="space-y-1.5">
            {report.deadStock.map(item => (
              <div key={item.productId} className="flex items-center justify-between py-1.5 border-b border-slate-50 dark:border-slate-800 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{item.name}</p>
                  <p className="text-[10px] text-slate-400">Last: {item.lastMovementDate || 'never'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reorder Suggestions */}
      <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={14} className="text-amber-500" />
          <h3 className="text-xs font-black uppercase text-slate-500">Reorder Suggestions</h3>
        </div>
        {report.reorderSuggestions.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">All products sufficiently stocked</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <th className="text-left py-1.5 text-[10px] font-bold text-slate-400 uppercase">Product</th>
                  <th className="text-right py-1.5 text-[10px] font-bold text-slate-400 uppercase">Stock</th>
                  <th className="text-right py-1.5 text-[10px] font-bold text-slate-400 uppercase">Threshold</th>
                  <th className="text-right py-1.5 text-[10px] font-bold text-slate-400 uppercase">Suggested Order</th>
                </tr>
              </thead>
              <tbody>
                {report.reorderSuggestions.map(item => (
                  <tr key={item.productId} className="border-b border-slate-50 dark:border-slate-800/60 last:border-0">
                    <td className="py-1.5 text-slate-700 dark:text-slate-200 font-semibold truncate max-w-[140px]">{item.name}</td>
                    <td className="py-1.5 text-right font-black tabular-nums text-amber-600">{item.currentStock}</td>
                    <td className="py-1.5 text-right tabular-nums text-slate-400">{item.threshold}</td>
                    <td className="py-1.5 text-right font-black tabular-nums text-emerald-600">{item.suggestedOrder}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
