import React from 'react'
import { Calendar } from 'lucide-react'
import { useTranslation } from '../../../lib/useTranslation'
import type { DateFilter, PaymentFilter } from '../hooks/useReportsState'

interface Props {
  dateFilter: DateFilter
  onDateFilter: (f: DateFilter) => void
  paymentFilter: PaymentFilter
  onPaymentFilter: (f: PaymentFilter) => void
  customRange: { from: string; to: string }
  onCustomRange: (r: { from: string; to: string }) => void
}

const CustomRangeBar: React.FC<{
  from: string; to: string; fromLabel: string; toLabel: string
  onChange: (next: { from: string; to: string }) => void
}> = ({ from, to, fromLabel, toLabel, onChange }) => (
  <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 bg-bg-secondary px-4 py-2 dark:border-slate-700">
    <Calendar size={14} className="text-brand-orange" />
    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
      {fromLabel}
      <input type="date" value={from} max={to || undefined}
        onChange={(e) => onChange({ from: e.target.value, to })}
        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
    </label>
    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
      {toLabel}
      <input type="date" value={to} min={from || undefined}
        onChange={(e) => onChange({ from, to: e.target.value })}
        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
    </label>
  </div>
)

export const ReportsFilters: React.FC<Props> = ({
  dateFilter, onDateFilter, paymentFilter, onPaymentFilter, customRange, onCustomRange
}) => {
  const { t } = useTranslation()

  const dateFilters: { value: DateFilter; label: string }[] = [
    { value: 'today', label: t('rep.today') },
    { value: 'week', label: t('rep.thisWeek') },
    { value: 'month', label: t('rep.thisMonth') },
    { value: 'all', label: t('rep.allTime') },
    { value: 'custom', label: t('rep.customRange') },
  ]
  const paymentFilters: { value: PaymentFilter; label: string }[] = [
    { value: 'all', label: t('deb.all') },
    { value: 'cash', label: t('rep.cash') },
    { value: 'mpesa', label: t('pos.mpesa') },
    { value: 'debt', label: t('rep.debt') },
  ]

  return (
    <>
      <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-slate-100 bg-bg-secondary px-4 py-2 dark:border-slate-700">
        {dateFilters.map((filter) => (
          <button key={filter.value} onClick={() => onDateFilter(filter.value)}
            className={`flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors ${dateFilter === filter.value ? 'bg-brand-orange text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'}`}>
            {filter.value === 'custom' && <Calendar size={11} />}
            {filter.label}
          </button>
        ))}
      </div>

      {dateFilter === 'custom' && (
        <CustomRangeBar from={customRange.from} to={customRange.to}
          fromLabel={t('label.date')} toLabel={t('label.date')} onChange={onCustomRange} />
      )}

      <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-slate-100 bg-bg-secondary px-4 py-2 dark:border-slate-700">
        {paymentFilters.map((filter) => (
          <button key={filter.value} onClick={() => onPaymentFilter(filter.value)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors ${paymentFilter === filter.value ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-800' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'}`}>
            {filter.label}
          </button>
        ))}
      </div>
    </>
  )
}

export default ReportsFilters
