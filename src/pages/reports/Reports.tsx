/**
 * Reports.tsx — Phase 13: Reports hub with tabbed navigation.
 *
 * Tabs: Sales | Inventory | Debt | Expense
 * Each tab renders its dedicated report view.
 */

import React, { useState } from 'react'
import { BarChart3, Package, DollarSign, Receipt } from 'lucide-react'
import { useTranslation } from '../../lib/useTranslation'
import { SalesReportView } from './components/SalesReportView'
import { InventoryReportView } from './components/InventoryReportView'
import { DebtReportView } from './components/DebtReportView'
import { ExpenseReportView } from './components/ExpenseReportView'

type ReportTab = 'sales' | 'inventory' | 'debt' | 'expense'

const TABS: { key: ReportTab; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { key: 'sales', label: 'Sales', icon: BarChart3 },
  { key: 'inventory', label: 'Inventory', icon: Package },
  { key: 'debt', label: 'Debt', icon: DollarSign },
  { key: 'expense', label: 'Expense', icon: Receipt },
]

const Reports: React.FC = () => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<ReportTab>('sales')

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg-primary transition-colors duration-200">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-bg-secondary px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-orange text-white">
            <BarChart3 size={14} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100">{t('rep.salesReports')}</h1>
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <div className="flex shrink-0 border-b border-slate-100 dark:border-slate-700 bg-bg-secondary">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
              activeTab === key
                ? 'border-brand-orange text-brand-orange'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'sales' && <SalesReportView />}
        {activeTab === 'inventory' && <InventoryReportView />}
        {activeTab === 'debt' && <DebtReportView />}
        {activeTab === 'expense' && <ExpenseReportView />}
      </div>
    </div>
  )
}

export default Reports
