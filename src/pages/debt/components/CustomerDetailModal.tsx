import React from 'react'
import { X, User, Phone, Mail, MapPin, Clock, DollarSign } from 'lucide-react'
import { useCustomerDebts } from '../../../hooks/useDatabase'
import { formatCurrency } from '../../../lib/formatting-currency'
import type { Customer } from '../../../lib/types'

const CustomerDetailModal: React.FC<{
  customer: Customer
  onClose: () => void
  onRecordPayment: (debtId: string) => void
}> = ({ customer, onClose, onRecordPayment }) => {
  const { data: debts = [] } = useCustomerDebts(customer.id)

  const totalOutstanding = debts
    .filter(d => d.status !== 'paid')
    .reduce((sum, d) => sum + (d.amount - (d.amountPaid || 0)), 0)

  const activeDebts = debts.filter(d => d.status !== 'paid')
  const paidDebts = debts.filter(d => d.status === 'paid')

  return (
    <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-bg-secondary w-full max-w-sm rounded-2xl shadow-xl animate-scale-in max-h-[85vh] flex flex-col transition-colors duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-50 dark:bg-blue-950/40 rounded-xl flex items-center justify-center">
              <User size={16} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">Customer Details</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">{customer.name}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X size={16} className="text-slate-400 dark:text-slate-500" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Customer info card */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-2 transition-colors duration-200">
            <p className="text-xs font-black text-slate-700 dark:text-slate-200">{customer.name}</p>
            {customer.phone && (
              <div className="flex items-center gap-2">
                <Phone size={12} className="text-slate-400 dark:text-slate-500" />
                <span className="text-xs text-slate-600 dark:text-slate-400">{customer.phone}</span>
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-2">
                <Mail size={12} className="text-slate-400 dark:text-slate-500" />
                <span className="text-xs text-slate-600 dark:text-slate-400">{customer.email}</span>
              </div>
            )}
            {customer.address && (
              <div className="flex items-center gap-2">
                <MapPin size={12} className="text-slate-400 dark:text-slate-500" />
                <span className="text-xs text-slate-600 dark:text-slate-400">{customer.address}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Clock size={12} className="text-slate-400 dark:text-slate-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Added {new Date(customer.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Outstanding summary */}
          {activeDebts.length > 0 && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-xl text-center transition-colors duration-200">
              <p className="text-[10px] font-bold text-red-400 uppercase">Total Outstanding</p>
              <p className="text-xl font-black text-red-600 dark:text-red-300">{formatCurrency(totalOutstanding)}</p>
              <p className="text-[10px] text-red-300 dark:text-red-500">{activeDebts.length} active debt{activeDebts.length !== 1 ? 's' : ''}</p>
            </div>
          )}

          {/* Active debts */}
          {activeDebts.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-2">
                Active Debts
              </p>
              <div className="space-y-2">
                {activeDebts.map(debt => {
                  const outstanding = debt.amount - (debt.amountPaid || 0)
                  return (
                    <div key={debt.id}
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl transition-colors duration-200">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Clock size={10} className="text-slate-400 dark:text-slate-500 shrink-0" />
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">
                            {new Date(debt.createdAt).toLocaleDateString()}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            debt.status === 'partial'
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                          }`}>
                            {debt.status === 'partial' ? 'Partial' : 'Pending'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">Outstanding:</span>
                          <span className="text-xs font-black text-red-600 dark:text-red-400">
                            {formatCurrency(outstanding)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => onRecordPayment(debt.id)}
                        className="ml-2 px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg font-bold text-[10px] hover:bg-emerald-100 dark:hover:bg-emerald-950/60 flex items-center gap-1 transition-colors shrink-0">
                        <DollarSign size={10} /> Pay
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Paid debts */}
          {paidDebts.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-2">
                Settled ({paidDebts.length})
              </p>
              <div className="space-y-1.5">
                {paidDebts.slice(0, 5).map(debt => (
                  <div key={debt.id}
                    className="flex items-center justify-between p-2 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg transition-colors duration-200">
                    <div className="flex items-center gap-1.5">
                      <Clock size={10} className="text-emerald-400 dark:text-emerald-500 shrink-0" />
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                        {new Date(debt.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full">
                      Paid
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {debts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-slate-500">
              <DollarSign size={24} className="mb-2 opacity-30" />
              <p className="text-xs font-semibold">No debts on record</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-2 shrink-0">
          <button onClick={onClose}
            className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default CustomerDetailModal
