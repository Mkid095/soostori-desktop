import React from 'react'
import { Banknote } from 'lucide-react'
import { formatCurrency } from '../../../lib/formatting-currency'
import { useTranslation } from '../../../lib/useTranslation'

interface CashPaymentViewProps {
  given: string
  setGiven: (v: string) => void
  total: number
  givenAmt: number
  change: number
  quickAmounts: number[]
}

const CashPaymentView: React.FC<CashPaymentViewProps> = ({
  given, setGiven, total, givenAmt, change, quickAmounts,
}) => {
  const { t } = useTranslation()
  return (
    <div className="space-y-3 p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 transition-colors duration-200">
      <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('pos.amountGiven')}</p>
      <input
        type="number"
        placeholder="0.00"
        value={given}
        onChange={e => setGiven(e.target.value)}
        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-4 px-4 font-semibold text-slate-700 dark:text-slate-100 focus:border-brand-orange outline-none text-center text-2xl transition-colors duration-200"
        autoFocus
      />
      <div className="flex gap-2 flex-wrap">
        {quickAmounts.map(a => (
          <button
            key={a}
            onClick={() => setGiven(String(a))}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-bold border transition-[background-color,border-color,color] ${
              givenAmt === a
                ? 'bg-emerald-500 text-white border-emerald-500'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-300'
            }`}
          >
            {formatCurrency(a)}
          </button>
        ))}
        <button
          onClick={() => setGiven(String(Math.ceil(total)))}
          className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${
            givenAmt === Math.ceil(total)
              ? 'bg-emerald-500 text-white border-emerald-500'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-300'
          }`}
        >
          {t('pos.exact')}
        </button>
      </div>
      {givenAmt > 0 && givenAmt < total && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-xl text-center border border-red-100 dark:border-red-900 transition-colors duration-200">
          <p className="text-sm text-red-600 dark:text-red-300 font-bold">
            {t('pos.insufficient')} — {t('pos.customerStillOwes')} {formatCurrency(total - givenAmt)}
          </p>
        </div>
      )}
      {givenAmt >= total && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-center border-2 border-emerald-200 dark:border-emerald-800 transition-colors duration-200">
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase mb-1">{t('pos.changeDue')}</p>
          <p className="text-3xl font-black text-emerald-700 dark:text-emerald-300">{formatCurrency(change)}</p>
        </div>
      )}
    </div>
  )
}

export default CashPaymentView
