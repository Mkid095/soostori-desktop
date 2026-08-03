import React from 'react'
import { User } from 'lucide-react'
import type { Customer } from '../../../lib/types'

const CustomerRow: React.FC<{
  customer: Customer
  onRecordDebt: () => void
}> = ({ customer, onRecordDebt }) => (
  <div className="bg-bg-secondary dark:bg-bg-secondary px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3 transition-colors duration-200">
    <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center shrink-0">
      <User size={14} className="text-slate-400 dark:text-slate-500" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{customer.name}</p>
      {customer.phone && <p className="text-[10px] text-slate-400 dark:text-slate-500">{customer.phone}</p>}
    </div>
    <button onClick={onRecordDebt}
      className="px-3 py-1.5 bg-brand-orange text-white rounded-lg text-[10px] font-bold shrink-0">
      Record Debt
    </button>
  </div>
)

export default CustomerRow
