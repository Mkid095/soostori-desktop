import React from 'react'
import type { SaleItem } from '../../../lib/types'
import { formatCurrency } from '../../../lib/formatting-currency'
import { useTranslation } from '../../../lib/useTranslation'

interface SaleItemsListProps {
  items: SaleItem[]
}

const SaleItemsList: React.FC<SaleItemsListProps> = ({ items }) => {
  const { t } = useTranslation()
  return (
    <div>
      <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">{t('rep.items')}</p>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-slate-700 dark:text-slate-200 truncate">{item.productName}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">{item.quantity} × {formatCurrency(item.unitPrice)}</p>
            </div>
            <span className="font-bold text-sm text-slate-700 dark:text-slate-200 ml-3">{formatCurrency(item.totalPrice)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SaleItemsList
