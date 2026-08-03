import React from 'react'
import { DollarSign, User } from 'lucide-react'
import type { Debt, Customer } from '../../../lib/types'
import DebtRow from './DebtRow'
import CustomerRow from './CustomerRow'

const DebtContent: React.FC<{
  activeTab: 'debts' | 'customers'
  filteredDebts: Debt[]
  filteredCustomers: Customer[]
  onRecordDebt: (c: Customer) => void
  onShowDetail: (d: Debt) => void
  onRecordPayment: (d: Debt) => void
}> = ({ activeTab, filteredDebts, filteredCustomers, onRecordDebt, onShowDetail, onRecordPayment }) => (
  <div className="flex-1 overflow-y-auto">
    {activeTab === 'debts' ? (
      filteredDebts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400 dark:text-slate-500">
          <DollarSign size={32} className="mb-2 opacity-30" />
          <p className="text-xs font-semibold">No debts found</p>
        </div>
      ) : filteredDebts.map(debt => (
        <DebtRow key={debt.id} debt={debt} onRecordPayment={() => onRecordPayment(debt)} onShowDetail={() => onShowDetail(debt)} />
      ))
    ) : filteredCustomers.length === 0 ? (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 dark:text-slate-500">
        <User size={32} className="mb-2 opacity-30" />
        <p className="text-xs font-semibold">No customers found</p>
      </div>
    ) : filteredCustomers.map(customer => (
      <CustomerRow key={customer.id} customer={customer} onRecordDebt={() => onRecordDebt(customer)} />
    ))}
  </div>
)

export default DebtContent
