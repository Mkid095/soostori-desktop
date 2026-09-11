import React from 'react'
import { Trash2, CheckCircle, DollarSign } from 'lucide-react'
import { useTranslation } from '../../../lib/useTranslation'
import { formatCurrency } from '../../../lib/formatting-currency'
import type { ExpenseRow } from '../hooks/useExpenses'

const CATEGORIES = ['rent', 'utilities', 'transport', 'supplies', 'salaries', 'other'] as const
type Cat = typeof CATEGORIES[number]

const categoryColors: Record<string, string> = {
  rent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  utilities: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  transport: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  supplies: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  salaries: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  other: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  paid: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
}

interface ExpenseListProps {
  expenses: ExpenseRow[]
  filteredExpenses: ExpenseRow[]
  totalFiltered: number
  categoryFilter: string
  onCategoryChange: (cat: string) => void
  onDelete: (id: string) => void
  onApprove: (id: string) => void
  onMarkPaid: (id: string) => void
}

const ExpenseList: React.FC<ExpenseListProps> = ({
  filteredExpenses, totalFiltered, categoryFilter,
  onCategoryChange, onDelete, onApprove, onMarkPaid,
}) => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="px-4 py-3 space-y-2 border-b border-slate-100 dark:border-slate-700 shrink-0">
        <select
          value={categoryFilter}
          onChange={e => onCategoryChange(e.target.value)}
          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:border-brand-orange transition-colors">
          <option value="all">{t('exp.filter.all')}</option>
          {CATEGORIES.map(c => (
            <option key={c} value={c}>{t(`exp.cat.${c}`)}</option>
          ))}
        </select>
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${categoryColors[e.category] ?? categoryColors.other}`}>
                      {t(`exp.cat.${e.category}`)}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColors[e.status]}`}>
                      {e.status}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                      {new Date(e.date).toLocaleDateString()}
                    </span>
                  </div>
                  {e.note && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">{e.note}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-black text-sm text-slate-700 dark:text-slate-200 tabular-nums">
                    {formatCurrency(e.amount)}
                  </span>
                  {e.status === 'pending' && (
                    <button
                      onClick={() => onApprove(e.id)}
                      title={t('exp.approve') || 'Approve'}
                      className="w-8 h-8 flex items-center justify-center text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 rounded-lg transition-colors">
                      <CheckCircle size={14} />
                    </button>
                  )}
                  {e.status !== 'paid' && (
                    <button
                      onClick={() => onMarkPaid(e.id)}
                      title={t('exp.markPaid') || 'Mark Paid'}
                      className="w-8 h-8 flex items-center justify-center text-green-500 hover:bg-green-50 dark:hover:bg-green-950/40 hover:text-green-600 rounded-lg transition-colors">
                      <DollarSign size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(e.id)}
                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500 rounded-lg transition-colors">
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
