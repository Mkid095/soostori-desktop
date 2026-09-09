import React from 'react'
import { formatCurrency } from '../../../lib/formatting-currency'
import { useTranslation } from '../../../lib/useTranslation'

interface SaleTotalsProps {
  subtotal: number
  discountAmount: number
  totalAmount: number
}

const SaleTotals: React.FC<SaleTotalsProps> = ({ subtotal, discountAmount, totalAmount }) => {
  const { t } = useTranslation()
  return (
    <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl transition-colors duration-200">
      <div className="flex justify-between text-sm">
        <span className="text-slate-500 dark:text-slate-400">{t('label.subtotal')}</span>
        <span className="font-semibold text-slate-700 dark:text-slate-200">{formatCurrency(subtotal)}</span>
      </div>
      {discountAmount > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">{t('label.discount')}</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">-{formatCurrency(discountAmount)}</span>
        </div>
      )}
      <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2 mt-2">
        <span className="font-bold text-slate-800 dark:text-slate-100">{t('label.total')}</span>
        <span className="font-black text-lg text-brand-orange">{formatCurrency(totalAmount)}</span>
      </div>
    </div>
  )
}

export default SaleTotals
