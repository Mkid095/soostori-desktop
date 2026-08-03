import React, { useState, useEffect } from 'react'
import { Search, Plus, DollarSign } from 'lucide-react'
import {
  useCustomers, useDebts, useCreateCustomer,
  useRecordDebtPayment, useCreateDebt, useDebtSummary,
} from '../../hooks/useDatabase'
import { formatCurrency } from '../../lib/formatting-currency'
import type { Customer, Debt } from '../../lib/types'
import { useDebtState } from './hooks/useDebtState'
import { subscribeHeaderActions } from '../../lib/header-controls-bus'
import { useTranslation } from '../../lib/useTranslation'
import DebtDetailModal from './components/DebtDetailModal'
import PaymentModal from './components/PaymentModal'
import AddCustomerSheet from './components/AddCustomerSheet'
import RecordDebtSheet from './components/RecordDebtSheet'
import DebtContent from './components/DebtContent'

const DebtManagement: React.FC = () => {
  const { t } = useTranslation()
  const { data: debts = [] } = useDebts()
  const { data: debtSummary } = useDebtSummary()
  const { data: customers = [] } = useCustomers()
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

  const { filteredDebts, filteredCustomers, pending, handlePayDebt, handleSaveCustomer, handleRecordDebt } =
    useDebtState(debts, customers, search, statusFilter, recordPayment, createCustomer, createDebt)

  const totalPending = debtSummary?.total ?? 0
  const pendingCount = debtSummary?.count ?? pending.length

  useEffect(() => subscribeHeaderActions((action) => {
    if (action.type === 'debts:addCustomer') { setShowAddCustomer(true); setActiveTab('customers') }
  }), [])

  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ value: string }>).detail
      setSearch(detail?.value ?? '')
    }
    window.addEventListener('soostori:app:debtSearch', listener)
    return () => window.removeEventListener('soostori:app:debtSearch', listener)
  }, [])

  const statusLabels: Record<string, string> = { all: t('deb.all'), pending: t('deb.pending'), partial: t('deb.partial'), paid: t('deb.paid') }

  return (
    <div className="h-full bg-bg-primary dark:bg-bg-primary flex flex-col overflow-hidden transition-colors duration-200">
      <div className="bg-bg-secondary dark:bg-bg-secondary px-4 py-3 border-b border-slate-200 dark:border-slate-700 shrink-0 transition-colors duration-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-orange rounded-xl flex items-center justify-center text-white">
              <DollarSign size={16} />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-800 dark:text-slate-100">{t('deb.debtManagement')}</h1>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">{pendingCount} {t('deb.outstanding')}</p>
            </div>
          </div>
          <div className="px-3 py-1.5 bg-red-50 dark:bg-red-950/40 rounded-full transition-colors duration-200">
            <span className="text-xs font-black text-red-600 dark:text-red-300">{formatCurrency(totalPending)}</span>
          </div>
        </div>

        <div className="flex gap-1 mb-2">
          <button onClick={() => setActiveTab('debts')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${activeTab === 'debts' ? 'bg-brand-orange text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
            {t('deb.title')} ({pendingCount})
          </button>
          <button onClick={() => setActiveTab('customers')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${activeTab === 'customers' ? 'bg-brand-orange text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
            {t('deb.customers')} ({customers.length})
          </button>
        </div>

        <div className="flex gap-2 items-center">
          <div className="relative flex-1 min-w-0">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={activeTab === 'customers' ? t('deb.searchCustomers') : t('deb.searchDebts')}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-2 pl-8 pr-3 text-xs font-semibold outline-none focus:border-brand-orange placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-800 dark:text-slate-100 transition-colors duration-200" />
          </div>
        </div>
        {activeTab === 'debts' && (
          <div className="flex gap-2 mt-2 overflow-x-auto pb-0.5">
            {(['all', 'pending', 'partial', 'paid'] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${statusFilter === s ? 'bg-brand-orange text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                {statusLabels[s]}
              </button>
            ))}
          </div>
        )}
      </div>

      {activeTab === 'customers' && !showAddCustomer && (
        <div className="px-4 py-2 bg-bg-secondary dark:bg-bg-secondary border-b border-slate-100 dark:border-slate-700 shrink-0 transition-colors duration-200">
          <button onClick={() => setShowAddCustomer(true)}
            className="w-full py-2 bg-slate-50 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center gap-1 transition-colors">
            <Plus size={12} /> {t('deb.addCustomer')}
          </button>
        </div>
      )}

      <DebtContent activeTab={activeTab} filteredDebts={filteredDebts} filteredCustomers={filteredCustomers}
        onRecordDebt={setRecordDebtFor} onShowDetail={setDetailDebt} onRecordPayment={setPayingDebt} />

      {activeTab === 'customers' && (
        <button onClick={() => setShowAddCustomer(true)}
          className="md:hidden fixed bottom-6 right-4 w-12 h-12 bg-brand-orange rounded-full shadow-lg flex items-center justify-center z-[240]">
          <Plus size={20} className="text-white" />
        </button>
      )}

      {recordDebtFor && (
        <RecordDebtSheet customer={recordDebtFor}
          onSave={async (amt) => { await handleRecordDebt(recordDebtFor.id, amt); setRecordDebtFor(null); setActiveTab('debts') }}
          onClose={() => setRecordDebtFor(null)} isSaving={createDebt.isPending} />
      )}
      {showAddCustomer && (
        <AddCustomerSheet onSave={handleSaveCustomer} onClose={() => setShowAddCustomer(false)} isSaving={createCustomer.isPending} />
      )}
      {payingDebt && (
        <PaymentModal debt={payingDebt} onPay={(a, m) => { handlePayDebt(payingDebt, a, m); setPayingDebt(null) }} onClose={() => setPayingDebt(null)} isSaving={recordPayment.isPending} />
      )}
      {detailDebt && (
        <DebtDetailModal debt={detailDebt} onClose={() => setDetailDebt(null)} onRecordPayment={() => { setPayingDebt(detailDebt); setDetailDebt(null) }} />
      )}
    </div>
  )
}

export default DebtManagement
