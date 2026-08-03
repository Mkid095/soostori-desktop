import React from 'react'
import type { CartItem } from '../../../lib/types'
import { formatCurrency } from '../../../lib/formatting-currency'

interface CartSummaryProps { cart: CartItem[]; total: number }

const CartSummary: React.FC<CartSummaryProps> = ({ cart, total }) => (
  <>
    <div className="text-center py-5 bg-orange-50 dark:bg-orange-950/40 rounded-2xl border border-orange-100 dark:border-orange-900/50 transition-colors duration-200">
      <p className="text-xs text-orange-500 dark:text-orange-400 font-bold uppercase tracking-wider mb-1">Amount Due</p>
      <p className="text-4xl font-black text-brand-orange">{formatCurrency(total)}</p>
    </div>
    <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 transition-colors duration-200">
      {cart.map((item, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{item.productName}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">{item.quantity} × {formatCurrency(item.unitPrice)}</p>
          </div>
          <p className="text-sm font-black text-slate-800 dark:text-slate-100">{formatCurrency(item.totalPrice)}</p>
        </div>
      ))}
    </div>
  </>
)

export default CartSummary
