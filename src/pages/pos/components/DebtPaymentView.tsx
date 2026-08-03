import React from 'react'
import { User, Phone } from 'lucide-react'
import type { Customer } from '../../../lib/types'
import { formatCurrency } from '../../../lib/formatting-currency'

interface DebtPaymentViewProps {
  customers: Customer[]
  debtCustomerId: string
  debtCustomerName: string
  debtCustomerPhone: string
  showNewCustomer: boolean
  total: number
  onSelect: (id: string) => void
  onNewName: (v: string) => void
  onNewPhone: (v: string) => void
  onShowNew: () => void
  onShowExisting: () => void
}

const DebtPaymentView: React.FC<DebtPaymentViewProps> = ({
  customers, debtCustomerId, debtCustomerName, debtCustomerPhone,
  showNewCustomer, total, onSelect, onNewName, onNewPhone, onShowNew, onShowExisting,
}) => (
  <div className="space-y-3 p-5 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-100 dark:border-amber-900/50 transition-colors duration-200">
    <p className="text-xs text-amber-700 dark:text-amber-300 font-semibold">
      Record debt — customer will owe {formatCurrency(total)}
    </p>

    {!showNewCustomer ? (
      <>
        <select
          value={debtCustomerId}
          onChange={e => onSelect(e.target.value)}
          className="w-full bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-xl py-3 px-3 text-sm font-semibold text-slate-700 dark:text-slate-100 outline-none focus:border-amber-400 transition-colors duration-200"
        >
          <option value="">— Select returning customer —</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>
              {c.name} {c.phone ? `(${c.phone})` : ''}
            </option>
          ))}
        </select>
        <button
          onClick={onShowNew}
          className="w-full py-2.5 text-brand-orange font-bold text-sm border-2 border-dashed border-brand-orange rounded-xl hover:bg-orange-50 dark:hover:bg-orange-950/40 transition-colors"
        >
          + New Customer
        </button>
      </>
    ) : (
      <div className="space-y-2 p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-800 transition-colors duration-200">
        <p className="text-xs font-bold text-amber-700 dark:text-amber-300">New Customer</p>
        <div className="flex items-center gap-2">
          <User size={14} className="text-amber-600 shrink-0" />
          <input
            type="text"
            placeholder="Customer name *"
            value={debtCustomerName}
            onChange={e => onNewName(e.target.value)}
            className="flex-1 bg-slate-50 dark:bg-slate-800 border border-amber-200 dark:border-amber-800 rounded-lg py-2 px-3 text-sm font-semibold text-slate-700 dark:text-slate-100 outline-none focus:border-amber-400 transition-colors duration-200"
            autoFocus
          />
        </div>
        <div className="flex items-center gap-2">
          <Phone size={14} className="text-amber-600 shrink-0" />
          <input
            type="tel"
            placeholder="Phone number *"
            value={debtCustomerPhone}
            onChange={e => onNewPhone(e.target.value)}
            className="flex-1 bg-slate-50 dark:bg-slate-800 border border-amber-200 dark:border-amber-800 rounded-lg py-2 px-3 text-sm font-semibold text-slate-700 dark:text-slate-100 outline-none focus:border-amber-400 transition-colors duration-200"
          />
        </div>
        <button
          onClick={onShowExisting}
          className="w-full text-xs text-slate-500 dark:text-slate-400 font-semibold hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          ← Back to existing customers
        </button>
      </div>
    )}
  </div>
)

export default DebtPaymentView
