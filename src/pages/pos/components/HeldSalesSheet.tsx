import React from 'react'
import { X, Clock, RotateCcw, Trash2, Package } from 'lucide-react'
import type { HeldSale, CartItem } from '../../../lib/types'
import { formatCurrency } from '../../../lib/formatting-currency'

interface HeldSalesSheetProps {
  heldSales: HeldSale[]
  onRecall: (s: HeldSale) => void
  onDelete: (id: string) => void
  onClose: () => void
}

// ============================================================
// HELD SALES — bottom sheet showing paused carts.
// ============================================================
const HeldSalesSheet: React.FC<HeldSalesSheetProps> = ({
  heldSales, onRecall, onDelete, onClose,
}) => (
  <div
    role="dialog"
    aria-modal="true"
    aria-label="Held orders"
    className="fixed inset-0 bg-black/40 dark:bg-black/60 z-[9999] flex items-end justify-center animate-fade-in"
  >
    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl shadow-2xl animate-slide-up border-t border-slate-100 dark:border-slate-800 transition-colors duration-200">
      {/* Drag handle */}
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="font-black text-slate-800 dark:text-slate-100 text-base">
            Held Orders
          </h2>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
            {heldSales.length} {heldSales.length === 1 ? 'order' : 'orders'} paused
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close held orders"
          className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
        >
          <X size={18} className="text-slate-400 dark:text-slate-500" />
        </button>
      </div>

      {/* List */}
      <div className="px-4 py-3 max-h-80 overflow-y-auto space-y-2">
        {heldSales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-slate-500">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-3">
              <Clock size={28} strokeWidth={1.6} className="opacity-50" />
            </div>
            <p className="font-bold text-sm text-slate-600 dark:text-slate-300">No held orders</p>
            <p className="text-xs mt-1 text-center max-w-[200px]">
              Tap Hold on a cart to save it here for later
            </p>
          </div>
        ) : (
          heldSales.map(s => <HeldSaleRow key={s.id} sale={s} onRecall={onRecall} onDelete={onDelete} onClose={onClose} />)
        )}
      </div>

      {/* Safe-area padding */}
      <div className="h-4" />
    </div>
  </div>
)

// ============================================================
// HELD SALE ROW — preview + Recall (primary) + Delete (danger)
// ============================================================
interface HeldSaleRowProps {
  sale: HeldSale
  onRecall: (s: HeldSale) => void
  onDelete: (id: string) => void
  onClose: () => void
}

const HeldSaleRow: React.FC<HeldSaleRowProps> = ({ sale, onRecall, onDelete, onClose }) => {
  const items: CartItem[] = sale.cartItems || []
  const total = items.reduce((sum, i) => sum + (i.totalPrice || 0), 0)
  const itemCount = items.reduce((sum, i) => sum + (i.quantity || 0), 0)

  return (
    <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors duration-200 border border-slate-100 dark:border-slate-700/60">
      {/* Preview */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-slate-700 dark:text-slate-200 truncate">
          {sale.name || 'Held Order'}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
          <Package size={10} className="shrink-0" />
          <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <span className="text-brand-orange font-black tabular-nums">{formatCurrency(total)}</span>
        </div>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
          {new Date(sale.createdAt).toLocaleString()}
        </p>
      </div>

      {/* Recall — primary action */}
      <button
        onClick={() => { onRecall(sale); onClose() }}
        className="min-h-[40px] min-w-[80px] px-3 bg-brand-orange text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-orange-600 shadow-sm shadow-orange-200/60 dark:shadow-orange-900/40 transition-colors active:scale-[0.97]"
        aria-label={`Recall ${sale.name || 'held order'}`}
      >
        <RotateCcw size={11} /> Recall
      </button>

      {/* Delete — danger action */}
      <button
        onClick={() => onDelete(sale.id)}
        className="w-10 h-10 flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-300 rounded-lg transition-colors"
        aria-label={`Delete ${sale.name || 'held order'}`}
      >
        <Trash2 size={15} />
      </button>
    </div>
  )
}

export default HeldSalesSheet
