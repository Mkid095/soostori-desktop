import React from 'react'
import { Trash2 } from 'lucide-react'
import { useTranslation } from '../../../lib/useTranslation'
import { formatCurrency } from '../../../lib/formatting-currency'
import type { ExpenseRow } from '../hooks/useExpenses'

export type ExpenseCategory = 'rent' | 'utilities' | 'transport' | 'supplies' | 'salaries' | 'other'

const CATEGORIES: ExpenseCategory[] = ['rent', 'utilities', 'transport', 'supplies', 'salaries', 'other']

interface ExpenseListProps {
  expenses: ExpenseRow[]
  filteredExpenses: ExpenseRow[]
  totalFiltered: number
  categoryFilter: ExpenseCategory | 'all'
  dateFrom: string
  dateTo: string
  onCategoryChange: (cat: ExpenseCategory | 'all') => void
  onDateFromChange: (d: string) => void
  onDateToChange: (d: string) => void
  onDelete: (id: string) => void
}

const ExpenseList: React.FC<ExpenseListProps> = ({
  filteredExpenses, totalFiltered, categoryFilter, dateFrom, dateTo,
  onCategoryChange, onDateFromChange, onDateToChange, onDelete,
}) => {
  const { t } = useTranslation()

  const categoryColors: Record<string, string> = {
    rent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    utilities: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    transport: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    supplies: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    salaries: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    other: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="px-4 py-3 space-y-2 border-b border-slate-100 dark:border-slate-700 shrink-0">
        <div className="flex gap-2 items-center">
          <select
            value={categoryFilter}
            onChange={e => onCategoryChange(e.target.value as ExpenseCategory | 'all')}
            className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:border-brand-orange transition-colors">
            <option value="all">{t('exp.filter.all')}</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{t(`exp.cat.${c}`)}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase shrink-0">{t('exp.filter.from')}</span>
          <input type="date" value={dateFrom} onChange={e => onDateFromChange(e.target.value)}
            className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:border-brand-orange transition-colors" />
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase shrink-0">{t('exp.filter.to')}</span>
          <input type="date" value={dateTo} onChange={e => onDateToChange(e.target.value)}
            className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:border-brand-orange transition-colors" />
        </div>
        <div className="flex justify-between items-center">
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase">
            {filteredExpenses.length} {filteredExpenses.length === 1 ? 'expense' : 'expenses'}
          </p>
          <p className="text-xs font-black text-slate-700 dark:text-slate-200">
            {t('exp.total')}: <span className="text-brand-orange">{formatCurrency(totalFiltered)}</span>
          </p>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filteredExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500">
            <p className="font-bold text-sm">{t('exp.noExpenses')}</p>
          </div>
        ) : (
          <div className="px-4 py-2 space-y-1.5">
            {filteredExpenses.map(e => (
              <div key={e.id}
                className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-100 dark:border-slate-700/60">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${categoryColors[e.category] ?? categoryColors.other}`}>
                      {t(`exp.cat.${e.category}`)}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                      {new Date(e.date).toLocaleDateString()}
                    </span>
                  </div>
                  {e.note && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">{e.note}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-black text-sm text-slate-700 dark:text-slate-200 tabular-nums">
                    {formatCurrency(e.amount)}
                  </span>
                  <button
                    onClick={() => onDelete(e.id)}
                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500 dark:hover:text-red-400 rounded-lg transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ExpenseList
