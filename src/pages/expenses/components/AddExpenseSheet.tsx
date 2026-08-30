import React, { useState } from 'react'
import { X, Check, Loader2 } from 'lucide-react'
import { useTranslation } from '../../../lib/useTranslation'

export type ExpenseCategory = 'rent' | 'utilities' | 'transport' | 'supplies' | 'salaries' | 'other'

const CATEGORIES: ExpenseCategory[] = ['rent', 'utilities', 'transport', 'supplies', 'salaries', 'other']

interface AddExpenseSheetProps {
  onSave: (data: { amount: number; category: string; note: string; date: string }) => Promise<void>
  onClose: () => void
  isSaving: boolean
}

const AddExpenseSheet: React.FC<AddExpenseSheetProps> = ({ onSave, onClose, isSaving }) => {
  const { t } = useTranslation()
  const today = new Date().toISOString().split('T')[0]

  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('other')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(today)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount) return
    onSave({ amount: parseFloat(amount), category, note, date })
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[9999] flex items-end animate-fade-in">
      <div className="bg-white dark:bg-bg-secondary w-full rounded-t-3xl shadow-2xl animate-slide-up transition-colors duration-200">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-700">
          <p className="font-black text-slate-800 dark:text-slate-100 text-sm">{t('exp.addExpense')}</p>
          <button onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X size={16} className="text-slate-400 dark:text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">
              {t('exp.amount')} *
            </label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 font-semibold text-slate-700 dark:text-slate-100 focus:border-brand-orange outline-none transition-colors duration-200"
              placeholder="0.00" autoFocus min="0" step="0.01" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">
              {t('exp.category')}
            </label>
            <select value={category} onChange={e => setCategory(e.target.value as ExpenseCategory)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 font-semibold text-slate-700 dark:text-slate-100 focus:border-brand-orange outline-none transition-colors duration-200">
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{t(`exp.cat.${c}`)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">
              {t('exp.note')}
            </label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 font-semibold text-slate-700 dark:text-slate-100 focus:border-brand-orange outline-none transition-colors duration-200 resize-none"
              placeholder="Optional note..." />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">
              {t('exp.date')}
            </label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 font-semibold text-slate-700 dark:text-slate-100 focus:border-brand-orange outline-none transition-colors duration-200" />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm transition-colors">
              {t('exp.cancel')}
            </button>
            <button type="submit" disabled={!amount || isSaving}
              className="flex-1 py-3 bg-brand-orange text-white rounded-xl font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-1">
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {isSaving ? t('exp.saving') : t('exp.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddExpenseSheet
