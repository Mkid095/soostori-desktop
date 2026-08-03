import React, { useState } from 'react'
import { X, DollarSign, Check, Loader2 } from 'lucide-react'
import { formatCurrency } from '../../../lib/formatting-currency'
import type { Debt } from '../../../lib/types'

const PaymentModal: React.FC<{
  debt: Debt
  onPay: (amount: number, method: string) => void
  onClose: () => void
  isSaving: boolean
}> = ({ debt, onPay, onClose, isSaving }) => {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('cash')
  const remaining = debt.amount - (debt.amountPaid || 0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || parseFloat(amount) <= 0) return
    onPay(parseFloat(amount), method)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-bg-secondary w-full max-w-sm rounded-2xl shadow-xl animate-scale-in transition-colors duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl flex items-center justify-center">
              <DollarSign size={16} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">Record Payment</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">{debt.customerName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X size={16} className="text-slate-400 dark:text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="text-center py-3 bg-slate-50 dark:bg-slate-800 rounded-xl transition-colors duration-200">
            <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase">Outstanding</p>
            <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{formatCurrency(remaining)}</p>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Amount</label>
            <input type="number" step="0.01" value={amount}
              onChange={e => setAmount(e.target.value)} autoFocus required
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 font-semibold text-slate-700 dark:text-slate-100 focus:border-brand-orange outline-none text-center text-lg transition-colors duration-200"
              placeholder="0.00" />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Method</label>
            <div className="grid grid-cols-3 gap-2">
              {['cash', 'mpesa', 'transfer'].map(m => (
                <button type="button" key={m} onClick={() => setMethod(m)}
                  className={`py-2 rounded-xl border-2 font-bold text-xs transition-colors ${
                    method === m
                      ? 'border-brand-orange bg-orange-50 dark:bg-orange-950/40 text-brand-orange'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                  }`}>
                  {m === 'cash' ? 'Cash' : m === 'mpesa' ? 'M-Pesa' : 'Transfer'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm transition-colors">Cancel</button>
            <button type="submit" disabled={!amount || isSaving}
              className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-1">
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {isSaving ? 'Saving...' : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PaymentModal
