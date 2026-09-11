import React, { useState, useMemo } from 'react'
import { Plus, Receipt, RefreshCw, TrendingUp } from 'lucide-react'
import {
  useExpenses, useCreateExpense, useDeleteExpense,
  useApproveExpense, useMarkExpensePaid,
  useExpenseSummary, useRecurringExpenses,
  useCreateRecurringExpense, useDeleteRecurringExpense,
  type ExpenseRow
} from './hooks/useExpenses'
import { useTranslation } from '../../lib/useTranslation'
import { formatCurrency } from '../../lib/formatting-currency'
import ExpenseList from './components/ExpenseList'
import AddExpenseSheet from './components/AddExpenseSheet'
import AddRecurringSheet from './components/AddRecurringSheet'
import type { ExpenseCategory } from './components/AddExpenseSheet'

const ExpensesPage: React.FC = () => {
  const { t } = useTranslation()
  const [showAdd, setShowAdd] = useState(false)
  const [showAddRecurring, setShowAddRecurring] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'all'>('all')

  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  )

  const { data: expenses = [] } = useExpenses(selectedMonth)
  const createExpense = useCreateExpense()
  const deleteExpense = useDeleteExpense()
  const approveExpense = useApproveExpense()
  const markPaid = useMarkExpensePaid()

  const { data: summary } = useExpenseSummary(selectedMonth)
  const { data: recurringExpenses = [] } = useRecurringExpenses()
  const createRecurring = useCreateRecurringExpense()
  const deleteRecurring = useDeleteRecurringExpense()

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const matchCat = categoryFilter === 'all' || e.category === categoryFilter
      return matchCat
    })
  }, [expenses, categoryFilter])

  const totalFiltered = filteredExpenses.reduce((sum, e) => sum + e.amount, 0)

  // Top category this month
  const topCategory = useMemo(() => {
    if (!summary?.byCategory) return null
    const entries = Object.entries(summary.byCategory)
    if (entries.length === 0) return null
    return entries.reduce((a, b) => b[1] > a[1] ? b : a)
  }, [summary])

  const handleSave = async (data: { amount: number; category: string; note: string; date: string }) => {
    await createExpense.mutateAsync(data)
    setShowAdd(false)
  }

  const handleSaveRecurring = async (data: { amount: number; category: string; frequency: string; nextDueDate: string }) => {
    await createRecurring.mutateAsync(data)
    setShowAddRecurring(false)
  }

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

  return (
    <div className="h-full bg-bg-primary dark:bg-bg-primary flex flex-col overflow-hidden transition-colors duration-200">
      {/* Header */}
      <div className="bg-bg-secondary dark:bg-bg-secondary px-4 py-3 border-b border-slate-200 dark:border-slate-700 shrink-0 transition-colors duration-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-orange rounded-xl flex items-center justify-center text-white">
              <Receipt size={16} />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-800 dark:text-slate-100">{t('exp.title')}</h1>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'} recorded
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddRecurring(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              <RefreshCw size={11} /> {t('exp.recurring') || 'Recurring'}
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-orange text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition-colors shadow-sm shadow-orange-200/60 dark:shadow-orange-900/40">
              <Plus size={12} /> {t('exp.addExpense')}
            </button>
          </div>
        </div>

        {/* Summary Widget */}
        {summary && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-2.5">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">{t('exp.totalThisMonth') || 'Total This Month'}</p>
              <p className="text-sm font-black text-slate-800 dark:text-slate-100">{formatCurrency(summary.total)}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-2.5">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">{t('exp.topCategory') || 'Top Category'}</p>
              {topCategory ? (
                <div className="flex items-center gap-1.5">
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${categoryColors[topCategory[0]] ?? categoryColors.other}`}>
                    {t(`exp.cat.${topCategory[0]}`)}
                  </span>
                  <span className="text-sm font-black text-slate-800 dark:text-slate-100">{formatCurrency(topCategory[1])}</span>
                </div>
              ) : (
                <p className="text-xs text-slate-400">—</p>
              )}
            </div>
          </div>
        )}

        {/* Month Filter */}
        <div className="flex items-center gap-2 mb-2">
          <button onClick={prevMonth} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-500">
            ‹
          </button>
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-brand-orange transition-colors" />
          <button onClick={nextMonth} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-500">
            ›
          </button>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase">{t('exp.filterCategory')}</p>
          <p className="text-xs font-black text-slate-700 dark:text-slate-200">
            {t('exp.total')}: <span className="text-brand-orange">{formatCurrency(totalFiltered)}</span>
          </p>
        </div>
      </div>

      {/* List with filters */}
      <ExpenseList
        expenses={filteredExpenses}
        filteredExpenses={filteredExpenses}
        totalFiltered={totalFiltered}
        categoryFilter={categoryFilter}
        onCategoryChange={(cat) => setCategoryFilter(cat as ExpenseCategory | 'all')}
        onDelete={id => deleteExpense.mutate(id)}
        onApprove={id => approveExpense.mutate(id)}
        onMarkPaid={id => markPaid.mutate(id)}
      />

      {/* Recurring Section */}
      {recurringExpenses.length > 0 && (
        <div className="border-t border-slate-200 dark:border-slate-700 shrink-0">
          <div className="px-4 py-2 flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60">
            <RefreshCw size={12} className="text-brand-orange" />
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">{t('exp.recurring') || 'Recurring Expenses'}</p>
          </div>
          <div className="px-4 py-2 space-y-1.5 max-h-36 overflow-y-auto">
            {recurringExpenses.map(r => (
              <div key={r.id}
                className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-700/60">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${categoryColors[r.category] ?? categoryColors.other}`}>
                      {t(`exp.cat.${r.category}`)}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 capitalize">
                      {r.frequency}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    {t('exp.nextDue') || 'Next'}: {new Date(r.next_due_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-black text-sm text-slate-700 dark:text-slate-200 tabular-nums">
                    {formatCurrency(r.amount)}
                  </span>
                  <button
                    onClick={() => deleteRecurring.mutate(r.id)}
                    className="w-7 h-7 flex items-center justify-center text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500 rounded-lg transition-colors">
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAdd && (
        <AddExpenseSheet
          onSave={handleSave}
          onClose={() => setShowAdd(false)}
          isSaving={createExpense.isPending}
        />
      )}

      {showAddRecurring && (
        <AddRecurringSheet
          onSave={handleSaveRecurring}
          onClose={() => setShowAddRecurring(false)}
          isSaving={createRecurring.isPending}
        />
      )}
    </div>
  )
}

export default ExpensesPage
