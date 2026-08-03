import React from 'react'
import { X, Clock, User, Phone, DollarSign } from 'lucide-react'
import { useSale } from '../../../hooks/useDatabase'
import { formatCurrency } from '../../../lib/formatting-currency'
import type { Debt, SaleItem } from '../../../lib/types'

const DebtDetailModal: React.FC<{
  debt: Debt
  onClose: () => void
  onRecordPayment: () => void
}> = ({ debt, onClose, onRecordPayment }) => {
  const { data: sale } = useSale(debt.saleId || '')
  const remaining = debt.amount - (debt.amountPaid || 0)
  const isPaid = debt.status === 'paid'

  return (
    <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-bg-secondary w-full max-w-sm rounded-2xl shadow-xl animate-scale-in max-h-[80vh] flex flex-col transition-colors duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-50 dark:bg-amber-950/40 rounded-xl flex items-center justify-center">
              <Clock size={16} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">Debt Details</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">{debt.customerName || 'Unknown Customer'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X size={16} className="text-slate-400 dark:text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1.5 transition-colors duration-200">
            <div className="flex items-center gap-2">
              <User size={12} className="text-slate-400 dark:text-slate-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{debt.customerName || 'Unknown'}</span>
            </div>
            {debt.customerPhone && (
              <div className="flex items-center gap-2">
                <Phone size={12} className="text-slate-400 dark:text-slate-500" />
                <span className="text-xs text-slate-600 dark:text-slate-400">{debt.customerPhone}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Clock size={12} className="text-slate-400 dark:text-slate-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(debt.createdAt).toLocaleString()}</span>
            </div>
          </div>

          {sale?.items && sale.items.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-2">Items Purchased</p>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-700 transition-colors duration-200">
                {sale.items.map((item: SaleItem, i: number) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{item.productName}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">{item.quantity} × {formatCurrency(item.unitPrice)}</p>
                    </div>
                    <p className="text-xs font-black text-slate-700 dark:text-slate-200">{formatCurrency(item.totalPrice)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-center transition-colors duration-200">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Total</p>
              <p className="text-sm font-black text-slate-700 dark:text-slate-200">{formatCurrency(debt.amount)}</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-center transition-colors duration-200">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Remaining</p>
              <p className="text-sm font-black text-red-600 dark:text-red-400">{formatCurrency(remaining)}</p>
            </div>
          </div>

          <div className={`text-center p-3 rounded-xl ${isPaid ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'bg-amber-50 dark:bg-amber-950/40'}`}>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              isPaid
                ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40'
                : 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40'
            }`}>
              {isPaid ? '✓ Fully Paid' : debt.status === 'partial' ? 'Partially Paid' : 'Pending Payment'}
            </span>
          </div>

          {debt.notes && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl transition-colors duration-200">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mb-1">Note</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">{debt.notes}</p>
            </div>
          )}
        </div>

        {!isPaid && (
          <div className="px-5 pb-5 pt-2">
            <button onClick={onRecordPayment}
              className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 flex items-center justify-center gap-2">
              <DollarSign size={14} /> Record Payment
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default DebtDetailModal
