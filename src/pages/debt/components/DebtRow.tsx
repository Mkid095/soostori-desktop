import React from 'react'
import { User, Clock, Phone, DollarSign } from 'lucide-react'
import { formatCurrency } from '../../../lib/formatting-currency'
import type { Debt } from '../../../lib/types'

const DebtRow: React.FC<{
  debt: Debt
  onRecordPayment: () => void
  onShowDetail: () => void
}> = ({ debt, onRecordPayment, onShowDetail }) => {
  const remaining = debt.amount - (debt.amountPaid || 0)
  const isPaid = debt.status === 'paid'
  const isPartial = debt.status === 'partial'
  const paid = debt.amountPaid || 0

  return (
    <div className={`flex items-center gap-3 px-4 py-3 border-b border-slate-50 dark:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors ${isPaid ? 'opacity-50' : ''}`}>
      <button onClick={onShowDetail} className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-1.5">
          <User size={11} className="text-slate-400 dark:text-slate-500 shrink-0" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{debt.customerName || 'Unknown'}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Clock size={10} className="text-slate-400 dark:text-slate-500 shrink-0" />
          <span className="text-[10px] text-slate-400 dark:text-slate-500">{new Date(debt.createdAt).toLocaleDateString()}</span>
          {debt.customerPhone && (
            <>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <Phone size={10} className="text-slate-400 dark:text-slate-500" />
              <span className="text-[10px] text-slate-400 dark:text-slate-500">{debt.customerPhone}</span>
            </>
          )}
        </div>
      </button>

      <div className="text-right">
        <p className="text-xs font-black text-slate-700 dark:text-slate-200">{formatCurrency(remaining)}</p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500">of {formatCurrency(debt.amount)}</p>
      </div>

      {!isPaid && (
        <div className="w-16 flex-shrink-0">
          <div className="h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-brand-orange rounded-full" style={{ width: `${Math.min((paid / debt.amount) * 100, 100)}%` }} />
          </div>
        </div>
      )}

      <div className="w-14 text-center flex-shrink-0">
        {isPaid ? (
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">Paid</span>
        ) : isPartial ? (
          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">Partial</span>
        ) : (
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">Pending</span>
        )}
      </div>

      {!isPaid && (
        <button onClick={onRecordPayment}
          className="px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg font-bold text-[10px] hover:bg-emerald-100 dark:hover:bg-emerald-950/60 flex items-center gap-1 flex-shrink-0 transition-colors">
          <DollarSign size={10} /> Pay
        </button>
      )}
    </div>
  )
}

export default DebtRow
