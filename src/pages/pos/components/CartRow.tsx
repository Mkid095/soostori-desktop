import React from 'react'
import { Minus, Plus, Trash2 } from 'lucide-react'
import type { CartItem } from '../../../lib/types'
import { formatCurrency } from '../../../lib/formatting-currency'

interface CartRowProps {
  item: CartItem
  onInc: () => void
  onDec: () => void
  onRm: () => void
}

const CartRow: React.FC<CartRowProps> = ({ item, onInc, onDec, onRm }) => (
  <div className="flex items-center gap-2 py-1.5 transition-colors duration-200">
    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{item.productName}</p>
      <p className="text-[10px] text-slate-400 dark:text-slate-500">{formatCurrency(item.unitPrice)}</p>
    </div>
    <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 rounded-lg px-1">
      <button onClick={onDec} className="w-5 h-5 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-brand-orange rounded">
        <Minus size={10} />
      </button>
      <span className="w-5 text-center font-black text-xs text-slate-800 dark:text-slate-100">{item.quantity}</span>
      <button onClick={onInc} className="w-5 h-5 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-brand-orange rounded">
        <Plus size={10} />
      </button>
    </div>
    <p className="text-xs font-black text-slate-800 dark:text-slate-100 w-16 text-right">{formatCurrency(item.totalPrice)}</p>
    <button onClick={onRm} className="p-1 text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors">
      <Trash2 size={11} />
    </button>
  </div>
)

export default CartRow
