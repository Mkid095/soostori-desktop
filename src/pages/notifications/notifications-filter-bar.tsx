/**
 * notifications-filter-bar.tsx — Phase 17 filter pill bar for NotificationsPage.
 */

import React from 'react'
import { Filter } from 'lucide-react'

const EVENT_TYPES = [
  { value: '', label: 'All' },
  { value: 'sale.created', label: 'Sales' },
  { value: 'debt.payment_recorded', label: 'Debt' },
  { value: 'inventory.low_stock', label: 'Stock' },
  { value: 'team.member_added', label: 'Team' },
  { value: 'commission.created', label: 'Commission' },
  { value: 'expense.created', label: 'Expense' },
]

interface NotificationsFilterBarProps {
  filter: string
  onFilterChange: (value: string) => void
}

const NotificationsFilterBar: React.FC<NotificationsFilterBarProps> = ({
  filter,
  onFilterChange,
}) => {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 bg-bg-secondary px-4 py-2 dark:border-slate-700">
      <Filter size={12} className="text-slate-400 shrink-0" />
      <div className="flex gap-1 overflow-x-auto">
        {EVENT_TYPES.map(et => (
          <button
            key={et.value}
            onClick={() => onFilterChange(et.value)}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold transition-colors ${
              filter === et.value
                ? 'bg-brand-orange text-white'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
            }`}
          >
            {et.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default NotificationsFilterBar
