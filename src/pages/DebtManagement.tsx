import React, { useState, useMemo, useCallback } from 'react'
import {
  Search, Plus, X, Check, Clock, DollarSign, User, Trash2,
  Phone, RefreshCw, CheckCircle, Loader2, ChevronRight,
} from 'lucide-react'
import {
  useCustomers, useDebts, useDebtSummary, useCreateCustomer,
  useRecordDebtPayment, useCreateDebt, useSale,
} from '../hooks/useDatabase'
import { formatCurrency } from '../lib/utils'
import type { Customer, Debt } from '../lib/types'

// ========== DEBT DETAIL MODAL ==========
const DebtDetailModal: React.FC<{
  debt: Debt, onClose: () => void, onRecordPayment: () => void
}> = ({ debt, onClose, onRecordPayment }) => {
  const { data: sale } = useSale(debt.saleId || '')
  const remaining = debt.amount - (debt.amountPaid || 0)
  const isPaid = debt.status === 'paid'

  return (
    <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl animate-scale-in max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center">
              <Clock size={16} className="text-amber-600" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">Debt Details</p>
              <p className="text-[10px] text-slate-400">{debt.customerName || 'Unknown Customer'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full">
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Customer info */}
          <div className="p-3 bg-slate-50 rounded-xl space-y-1.5">
            <div className="flex items-center gap-2">
              <User size={12} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-700">{debt.customerName || 'Unknown'}</span>
            </div>
            {debt.customerPhone && (
              <div className="flex items-center gap-2">
                <Phone size={12} className="text-slate-400" />
                <span className="text-xs text-slate-600">{debt.customerPhone}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Clock size={12} className="text-slate-400" />
              <span className="text-xs text-slate-500">{new Date(debt.createdAt).toLocaleString()}</span>
            </div>
          </div>

          {/* Sale items */}
          {sale?.items && sale.items.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Items Purchased</p>
              <div className="bg-slate-50 rounded-xl divide-y divide-slate-100">
                {sale.items.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">{item.productName}</p>
                      <p className="text-[10px] text-slate-400">{item.quantity} × {formatCurrency(item.unitPrice)}</p>
                    </div>
                    <p className="text-xs font-black text-slate-700">{formatCurrency(item.totalPrice)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Amounts */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-slate-50 rounded-xl text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Total</p>
              <p className="text-sm font-black text-slate-700">{formatCurrency(debt.amount)}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Remaining</p>
              <p className="text-sm font-black text-red-600">{formatCurrency(remaining)}</p>
            </div>
          </div>

          {/* Status */}
          <div className={`text-center p-3 rounded-xl ${isPaid ? 'bg-emerald-50' : 'bg-amber-50'}`}>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              isPaid ? 'text-emerald-700 bg-emerald-100' : 'text-amber-700 bg-amber-100'
            }`}>
              {isPaid ? '✓ Fully Paid' : debt.status === 'partial' ? 'Partially Paid' : 'Pending Payment'}
            </span>
          </div>

          {debt.notes && (
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Note</p>
              <p className="text-xs text-slate-600">{debt.notes}</p>
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

// ========== DEBT ROW ==========
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
    <div className={`flex items-center gap-3 px-4 py-3 border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${isPaid ? 'opacity-50' : ''}`}>
      {/* Customer info */}
      <button onClick={onShowDetail} className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-1.5">
          <User size={11} className="text-slate-400 shrink-0" />
          <span className="text-xs font-bold text-slate-700 truncate">{debt.customerName || 'Unknown'}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Clock size={10} className="text-slate-400 shrink-0" />
          <span className="text-[10px] text-slate-400">{new Date(debt.createdAt).toLocaleDateString()}</span>
          {debt.customerPhone && <><span className="text-slate-300">•</span><Phone size={10} className="text-slate-400" /><span className="text-[10px] text-slate-400">{debt.customerPhone}</span></>}
        </div>
      </button>

      {/* Paid / remaining */}
      <div className="text-right">
        <p className="text-xs font-black text-slate-700">{formatCurrency(remaining)}</p>
        <p className="text-[10px] text-slate-400">of {formatCurrency(debt.amount)}</p>
      </div>

      {/* Progress bar */}
      {!isPaid && (
        <div className="w-16 flex-shrink-0">
          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-brand-orange rounded-full" style={{ width: `${Math.min((paid / debt.amount) * 100, 100)}%` }} />
          </div>
        </div>
      )}

      {/* Status */}
      <div className="w-14 text-center flex-shrink-0">
        {isPaid ? (
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Paid</span>
        ) : isPartial ? (
          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Partial</span>
        ) : (
          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Pending</span>
        )}
      </div>

      {/* Record payment */}
      {!isPaid && (
        <button onClick={onRecordPayment}
          className="px-2.5 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg font-bold text-[10px] hover:bg-emerald-100 flex items-center gap-1 flex-shrink-0">
          <DollarSign size={10} /> Pay
        </button>
      )}
    </div>
  )
}

// ========== PAYMENT MODAL ==========
const PaymentModal: React.FC<{
  debt: Debt, onPay: (amount: number, method: string) => void, onClose: () => void, isSaving: boolean
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
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl animate-scale-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center">
              <DollarSign size={16} className="text-emerald-600" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">Record Payment</p>
              <p className="text-[10px] text-slate-400">{debt.customerName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full">
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="text-center py-3 bg-slate-50 rounded-xl">
            <p className="text-xs text-slate-400 font-bold uppercase">Outstanding</p>
            <p className="text-2xl font-black text-slate-800">{formatCurrency(remaining)}</p>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Amount</label>
            <input type="number" step="0.01" value={amount}
              onChange={e => setAmount(e.target.value)} autoFocus required
              className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 font-semibold text-slate-700 focus:border-brand-orange outline-none text-center text-lg"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Method</label>
            <div className="grid grid-cols-3 gap-2">
              {['cash', 'mpesa', 'transfer'].map(m => (
                <button type="button" key={m} onClick={() => setMethod(m)}
                  className={`py-2 rounded-xl border-2 font-bold text-xs transition-colors ${
                    method === m ? 'border-brand-orange bg-orange-50 text-brand-orange' : 'border-slate-200 text-slate-500'
                  }`}>
                  {m === 'cash' ? 'Cash' : m === 'mpesa' ? 'M-Pesa' : 'Transfer'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm">Cancel</button>
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

// ========== ADD CUSTOMER SHEET ==========
const AddCustomerSheet: React.FC<{
  onSave: (data: { name: string; phone?: string }) => void, onClose: () => void, isSaving: boolean
}> = ({ onSave, onClose, isSaving }) => {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  return (
    <div className="fixed inset-0 bg-black/40 z-[9999] flex items-end animate-fade-in">
      <div className="bg-white w-full rounded-t-3xl shadow-2xl animate-slide-up">
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-slate-200 rounded-full" /></div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <p className="font-black text-slate-800 text-sm">New Customer</p>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full"><X size={16} className="text-slate-400" /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); name && onSave({ name, phone }) }} className="p-5 space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} required
              className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 font-semibold text-slate-700 focus:border-brand-orange outline-none"
              placeholder="Customer name" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 font-semibold text-slate-700 focus:border-brand-orange outline-none"
              placeholder="+254..." />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm">Cancel</button>
            <button type="submit" disabled={!name || isSaving}
              className="flex-1 py-3 bg-brand-orange text-white rounded-xl font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-1">
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {isSaving ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ========== MAIN DEBT MANAGEMENT ==========
const DebtManagement: React.FC = () => {
  const { data: debts = [] } = useDebts()
  const { data: customers = [] } = useCustomers()
  const { data: summary } = useDebtSummary()
  const createCustomer = useCreateCustomer()
  const recordPayment = useRecordDebtPayment()
  const createDebt = useCreateDebt()

  const [activeTab, setActiveTab] = useState<'debts' | 'customers'>('debts')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'partial' | 'paid'>('all')
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null)
  const [detailDebt, setDetailDebt] = useState<Debt | null>(null)
  const [recordDebtFor, setRecordDebtFor] = useState<Customer | null>(null)
  const [recordDebtAmount, setRecordDebtAmount] = useState('')

  const handleSaveCustomer = async (data: { name: string; phone?: string }) => {
    await createCustomer.mutateAsync(data)
    setShowAddCustomer(false)
  }

  const handlePayDebt = async (amount: number, method: string) => {
    if (!payingDebt) return
    await recordPayment.mutateAsync({ debtId: payingDebt.id, amount, paymentMethod: method })
    setPayingDebt(null)
  }

  const handleRecordDebt = async () => {
    if (!recordDebtFor || !recordDebtAmount) return
    await createDebt.mutateAsync({
      customerId: recordDebtFor.id,
      amount: parseFloat(recordDebtAmount),
      notes: '',
    })
    setRecordDebtFor(null)
    setRecordDebtAmount('')
    setActiveTab('debts')
  }

  const filteredDebts = useMemo(() => {
    return debts.filter(d => {
      const mS = !search ||
        (d.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
        (d.customerPhone || '').includes(search)
      const mF = statusFilter === 'all' || d.status === statusFilter
      return mS && mF
    })
  }, [debts, search, statusFilter])

  const filteredCustomers = useMemo(() => {
    if (!search) return customers
    return customers.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || '').includes(search)
    )
  }, [customers, search])

  const pending = debts.filter(d => d.status !== 'paid')
  const totalPending = pending.reduce((s, d) => s + (d.amount - (d.amountPaid || 0)), 0)

  return (
    <div className="h-full bg-soft-yellow flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-orange rounded-xl flex items-center justify-center text-white">
              <DollarSign size={16} />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-800">Debt Management</h1>
              <p className="text-[10px] text-slate-400">{pending.length} outstanding</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="px-3 py-1.5 bg-red-50 rounded-full">
              <span className="text-xs font-black text-red-600">{formatCurrency(totalPending)}</span>
            </div>
          </div>
        </div>

        {/* Tab buttons */}
        <div className="flex gap-1 mb-2">
          <button onClick={() => setActiveTab('debts')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'debts' ? 'bg-brand-orange text-white' : 'bg-slate-100 text-slate-500'
            }`}>
            Debts ({pending.length})
          </button>
          <button onClick={() => setActiveTab('customers')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'customers' ? 'bg-brand-orange text-white' : 'bg-slate-100 text-slate-500'
            }`}>
            Customers ({customers.length})
          </button>
        </div>

        {/* Search + debt filter */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={activeTab === 'customers' ? 'Search customers...' : 'Search debts...'}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-8 pr-3 text-xs font-semibold outline-none focus:border-brand-orange placeholder:text-slate-400" />
          </div>
          {activeTab === 'debts' && (
            <div className="flex gap-1">
              {(['all', 'pending', 'partial', 'paid'] as const).map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${
                    statusFilter === s ? 'bg-brand-orange text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add customer */}
      {!showAddCustomer && activeTab === 'customers' && (
        <div className="px-4 py-2 bg-white border-b border-slate-100 shrink-0">
          <button onClick={() => setShowAddCustomer(true)}
            className="w-full py-2 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 flex items-center justify-center gap-1">
            <Plus size={12} /> Add Customer
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'debts' ? (
          filteredDebts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <DollarSign size={32} className="mb-2 opacity-30" />
              <p className="text-xs font-semibold">No debts found</p>
            </div>
          ) : (
            filteredDebts.map(debt => (
              <DebtRow key={debt.id} debt={debt}
                onRecordPayment={() => setPayingDebt(debt)}
                onShowDetail={() => setDetailDebt(debt)} />
            ))
          )
        ) : (
          filteredCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <User size={32} className="mb-2 opacity-30" />
              <p className="text-xs font-semibold">No customers found</p>
            </div>
          ) : (
            filteredCustomers.map(customer => (
              <div key={customer.id} className="bg-white px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
                  <User size={14} className="text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-700 truncate">{customer.name}</p>
                  {customer.phone && <p className="text-[10px] text-slate-400">{customer.phone}</p>}
                </div>
                <button onClick={() => { setRecordDebtFor(customer); setRecordDebtAmount('') }}
                  className="px-3 py-1.5 bg-brand-orange text-white rounded-lg text-[10px] font-bold shrink-0">
                  Record Debt
                </button>
              </div>
            ))
          )
        )}
      </div>

      {/* FAB */}
      {activeTab === 'customers' ? (
        <button onClick={() => setShowAddCustomer(true)}
          className="md:hidden fixed bottom-6 right-4 w-12 h-12 bg-brand-orange rounded-full shadow-lg flex items-center justify-center z-[240]">
          <Plus size={20} className="text-white" />
        </button>
      ) : null}

      {/* Record Debt Modal */}
      {recordDebtFor && (
        <div className="fixed inset-0 bg-black/40 z-[9999] flex items-end animate-fade-in">
          <div className="bg-white w-full rounded-t-3xl shadow-2xl animate-slide-up">
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-slate-200 rounded-full" /></div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <p className="font-black text-slate-800 text-sm">Record Debt for {recordDebtFor.name}</p>
              <button onClick={() => setRecordDebtFor(null)} className="p-1.5 hover:bg-slate-100 rounded-full"><X size={16} className="text-slate-400" /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); handleRecordDebt() }} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Amount (KES) *</label>
                <input type="number" value={recordDebtAmount} onChange={e => setRecordDebtAmount(e.target.value)} required
                  className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 font-semibold text-slate-700 focus:border-brand-orange outline-none"
                  placeholder="0.00" autoFocus />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setRecordDebtFor(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm">Cancel</button>
                <button type="submit" disabled={!recordDebtAmount || createDebt.isPending}
                  className="flex-1 py-3 bg-brand-orange text-white rounded-xl font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-1">
                  {createDebt.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {createDebt.isPending ? 'Saving...' : 'Record Debt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddCustomer && (
        <AddCustomerSheet onSave={handleSaveCustomer} onClose={() => setShowAddCustomer(false)} isSaving={createCustomer.isPending} />
      )}
      {payingDebt && (
        <PaymentModal debt={payingDebt} onPay={handlePayDebt} onClose={() => setPayingDebt(null)} isSaving={recordPayment.isPending} />
      )}
      {detailDebt && (
        <DebtDetailModal debt={detailDebt}
          onClose={() => setDetailDebt(null)}
          onRecordPayment={() => { setPayingDebt(detailDebt); setDetailDebt(null) }} />
      )}
    </div>
  )
}

export default DebtManagement
