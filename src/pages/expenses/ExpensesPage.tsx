import React, { useState, useMemo } from 'react'
import { Plus, Receipt } from 'lucide-react'
import { useExpenses, useCreateExpense, useDeleteExpense } from './hooks/useExpenses'
import { useTranslation } from '../../lib/useTranslation'
import { formatCurrency } from '../../lib/formatting-currency'
import ExpenseList from './components/ExpenseList'
import AddExpenseSheet from './components/AddExpenseSheet'
import type { ExpenseCategory } from './components/AddExpenseSheet'

const ExpensesPage: React.FC = () => {
  const { t } = useTranslation()
  const { data: expenses = [] } = useExpenses()
  const createExpense = useCreateExpense()
  const deleteExpense = useDeleteExpense()

  const [showAdd, setShowAdd] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'all'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const matchCat = categoryFilter === 'all' || e.category === categoryFilter
      const matchFrom = !dateFrom || e.date >= dateFrom
      const matchTo = !dateTo || e.date <= dateTo
      return matchCat && matchFrom && matchTo
    })
  }, [expenses, categoryFilter, dateFrom, dateTo])

  const totalFiltered = filteredExpenses.reduce((sum, e) => sum + e.amount, 0)

  const handleSave = async (data: { amount: number; category: string; note: string; date: string }) => {
    await createExpense.mutateAsync(data)
    setShowAdd(false)
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
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-orange text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition-colors shadow-sm shadow-orange-200/60 dark:shadow-orange-900/40">
            <Plus size={12} /> {t('exp.addExpense')}
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
        expenses={expenses}
        filteredExpenses={filteredExpenses}
        totalFiltered={totalFiltered}
        categoryFilter={categoryFilter}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onCategoryChange={setCategoryFilter}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onDelete={id => deleteExpense.mutate(id)}
      />

      {showAdd && (
        <AddExpenseSheet
          onSave={handleSave}
          onClose={() => setShowAdd(false)}
          isSaving={createExpense.isPending}
        />
      )}
    </div>
  )
}

export default ExpensesPage
