import React from 'react'
import { CreditCard, CheckCircle } from 'lucide-react'
import { formatCurrency } from '../../../lib/formatting-currency'
import { useTranslation } from '../../../lib/useTranslation'

interface CardPaymentViewProps {
  total: number
}

const CardPaymentView: React.FC<CardPaymentViewProps> = ({ total }) => {
  const { t } = useTranslation()
  return (
    <div className="space-y-4 p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 transition-colors duration-200">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950/50 rounded-full flex items-center justify-center">
          <CreditCard size={24} className="text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-600 dark:text-slate-300">{t('pos.cardPayment')}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">{t('pos.cardPaymentHint')}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 text-center border border-slate-200 dark:border-slate-700 transition-colors duration-200">
        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">{t('pos.amountDue')}</p>
        <p className="text-3xl font-black text-slate-800 dark:text-slate-100">{formatCurrency(total)}</p>
      </div>

      <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl text-center border border-blue-100 dark:border-blue-900 transition-colors duration-200">
        <CheckCircle size={24} className="mx-auto mb-2 text-blue-500 dark:text-blue-400" />
        <p className="text-sm font-bold text-blue-700 dark:text-blue-300">{t('pos.insertCard')}</p>
        <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">{t('pos.confirmCard')}</p>
      </div>
    </div>
  )
}

export default CardPaymentView
