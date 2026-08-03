import React from 'react'
import { AlertCircle, Banknote, CreditCard, Smartphone } from 'lucide-react'
import { formatCurrency } from '../../../lib/formatting-currency'
import { useTranslation } from '../../../lib/useTranslation'
import type { Sale } from '../../../lib/types'

interface ReportsSaleListProps {
  sales: Sale[]
  onSelect: (saleId: string) => void
}

const methodMeta = (method: string, cashLabel: string, mpesaLabel: string, debtLabel: string) => {
  if (method === 'cash') return { label: cashLabel, icon: Banknote, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800' }
  if (method === 'mpesa' || method === 'mobile_money') return { label: mpesaLabel, icon: Smartphone, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/40', border: 'border-green-200 dark:border-green-800' }
  if (method === 'debt') return { label: debtLabel, icon: AlertCircle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-800' }
  return { label: method, icon: CreditCard, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800', border: 'border-slate-200 dark:border-slate-700' }
}

export const ReportsSaleList: React.FC<ReportsSaleListProps> = ({ sales, onSelect }) => {
  const { t } = useTranslation()
  const cashLabel = t('rep.cash')
  const mpesaLabel = t('pos.mpesa')
  const debtLabel = t('rep.debt')
  const noItemsLabel = t('rep.noItems')
  const noteLabel = `Note:`
  return (
    <>
      {sales.map((sale) => {
        const meta = methodMeta(sale.paymentMethod, cashLabel, mpesaLabel, debtLabel)
        const Icon = meta.icon
        return (
          <button
            key={sale.id}
            onClick={() => onSelect(sale.id)}
            className={`flex w-full items-center gap-3 border-b border-l-4 border-slate-100 bg-bg-secondary px-4 py-3.5 text-left transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50 ${meta.border}`}
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.bg}`}>
              <Icon size={16} className={meta.color} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <b className="text-base font-black tabular-nums text-slate-800 dark:text-slate-100">{formatCurrency(sale.totalAmount)}</b>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.bg} ${meta.color}`}>{meta.label}</span>
              </div>
              <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">{sale.items_summary || noItemsLabel}</p>
              {sale.note && <p className="mt-0.5 truncate text-[10px] italic text-slate-400 dark:text-slate-500">{noteLabel} {sale.note}</p>}
            </div>
            <div className="shrink-0 text-right text-[10px] font-semibold text-slate-400 dark:text-slate-500">
              <p className="text-slate-600 dark:text-slate-300">{new Date(sale.createdAt).toLocaleDateString()}</p>
              <p>{new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </button>
        )
      })}
    </>
  )
}

export default ReportsSaleList
