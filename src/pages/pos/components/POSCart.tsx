import React from 'react'
import { ShoppingBag, ShoppingCart, Trash2, Pause, CheckCircle, Clipboard } from 'lucide-react'
import type { CartItem } from '../../../lib/types'
import { formatCurrency } from '../../../lib/formatting-currency'
import { useTranslation } from '../../../lib/useTranslation'
import type { TranslationKey } from '../../../lib/i18n'
import CartRow from './CartRow'

interface POSCartProps {
  cart: CartItem[]
  subtotal: number
  itemCount: number
  onInc: (id: string) => void
  onDec: (id: string) => void
  onRm: (id: string) => void
  onClear: () => void
  onHold: () => void
  onCheckoutOpen: () => void
  onShowHeld: () => void
}

const POSCart: React.FC<POSCartProps> = ({
  cart, subtotal, itemCount, onInc, onDec, onRm, onClear, onHold, onCheckoutOpen, onShowHeld,
}) => {
  const { t } = useTranslation()
  return (
    <div className="w-72 bg-bg-secondary dark:bg-slate-900 border-l border-border-color dark:border-slate-700 flex flex-col shrink-0 transition-colors duration-200">
      <div className="px-3 py-2 border-b border-border-color dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ShoppingCart size={14} className="text-brand-orange" />
          <span className="text-xs font-black text-slate-700 dark:text-slate-200">{t('pos.cart' as TranslationKey)}</span>
          {itemCount > 0 && (
            <span className="px-1.5 py-0.5 bg-brand-orange text-white rounded-full text-[10px] font-bold">
              {itemCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onShowHeld} title={t('pos.heldSales' as TranslationKey)}
            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors">
            <Clipboard size={13} />
          </button>
          <button onClick={onClear} disabled={!cart.length}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4 py-10 text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/30 flex items-center justify-center mb-4 shadow-inner">
              <ShoppingBag size={36} strokeWidth={1.4} className="text-brand-orange/70" />
            </div>
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">{t('pos.cartEmpty' as TranslationKey)}</p>
            <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">{t('pos.cartEmptyHint' as TranslationKey)}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/70 px-3 py-1">
            {cart.map(item => (
              <CartRow key={item.productId} item={item} onInc={() => onInc(item.productId)} onDec={() => onDec(item.productId)} onRm={() => onRm(item.productId)} />
            ))}
          </div>
        )}
      </div>

      <div className="px-3 py-3 border-t border-border-color dark:border-slate-700 space-y-2.5 bg-bg-secondary dark:bg-slate-900 transition-colors duration-200">
        <div className="flex justify-between items-baseline px-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total</span>
          <span className="text-2xl font-black text-brand-orange tabular-nums leading-none">{formatCurrency(subtotal)}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onHold} disabled={!cart.length}
            className="min-h-[44px] py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-colors">
            <Pause size={12} /> {t('pos.hold' as TranslationKey)}
          </button>
          <button onClick={onCheckoutOpen} disabled={!cart.length}
            className="min-h-[44px] py-2.5 bg-brand-orange text-white rounded-xl font-bold text-xs hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-orange-200/60 dark:shadow-orange-900/40 flex items-center justify-center gap-1.5 transition-colors active:scale-[0.98]">
            <CheckCircle size={12} /> {t('pos.pay' as TranslationKey)}
          </button>
        </div>
      </div>
    </div>
  )
}

export default POSCart
