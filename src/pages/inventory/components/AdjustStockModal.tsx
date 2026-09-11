import { useState } from 'react'
import { X, PackageSearch, ArrowUpDown, Loader2 } from 'lucide-react'
import type { Product } from '../../../lib/types'

interface AdjustStockModalProps {
  products: Product[]
  onAdjust: (data: { productId: string; quantityChange: number; reason: string }) => void
  onClose: () => void
  isSaving: boolean
}

const ADJUST_REASONS = ['correction', 'breakage', 'theft', 'return', 'other']

export const AdjustStockModal: React.FC<AdjustStockModalProps> = ({
  products, onAdjust, onClose, isSaving
}) => {
  const [selectedProductId, setSelectedProductId] = useState('')
  const [delta, setDelta] = useState('')
  const [isIncrease, setIsIncrease] = useState(true)
  const [reason, setReason] = useState('correction')
  const [notes, setNotes] = useState('')

  const selectedProduct = products.find(p => p.id === selectedProductId)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProductId || !delta) return
    const qty = parseInt(delta)
    if (isNaN(qty) || qty <= 0) return
    const quantityChange = isIncrease ? qty : -qty
    onAdjust({ productId: selectedProductId, quantityChange, reason })
  }

  const deltaNum = parseInt(delta) || 0
  const isValid = selectedProductId && deltaNum > 0

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-xl flex flex-col">
        {/* Header */}
        <div className="shrink-0 px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center shrink-0 text-white">
              <ArrowUpDown size={16} />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-800 dark:text-slate-100">Adjust Stock</h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Manual correction (+/-)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {/* Product Selector */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5 block">
              Product *
            </label>
            <div className="relative">
              <PackageSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={selectedProductId}
                onChange={e => setSelectedProductId(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-100 focus:border-amber-500 outline-none transition-colors appearance-none"
              >
                <option value="">Select product...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.stockQuantity} in stock)</option>
                ))}
              </select>
            </div>
            {selectedProduct && (
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                Current stock: {selectedProduct.stockQuantity} {selectedProduct.unit}
              </p>
            )}
          </div>

          {/* +/- Toggle */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5 block">
              Adjustment Type
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsIncrease(true)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                  isIncrease
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                }`}
              >
                + Increase
              </button>
              <button
                type="button"
                onClick={() => setIsIncrease(false)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                  !isIncrease
                    ? 'bg-red-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                }`}
              >
                − Decrease
              </button>
            </div>
          </div>

          {/* Delta Quantity */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5 block">
              Quantity *
            </label>
            <input
              type="number"
              min="1"
              value={delta}
              onChange={e => setDelta(e.target.value)}
              required
              placeholder="e.g. 5"
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-100 focus:border-amber-500 outline-none transition-colors"
              autoFocus
            />
            {delta && selectedProduct && (
              <p className={`text-[10px] font-semibold mt-1 ${isIncrease ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {isIncrease ? '+' : '−'}{deltaNum} → New stock: {isIncrease ? selectedProduct.stockQuantity + deltaNum : selectedProduct.stockQuantity - deltaNum} {selectedProduct.unit}
              </p>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5 block">
              Reason *
            </label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-100 focus:border-amber-500 outline-none transition-colors"
            >
              {ADJUST_REASONS.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5 block">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={2}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-100 focus:border-amber-500 outline-none transition-colors resize-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="shrink-0 px-5 py-3.5 border-t border-slate-100 dark:border-slate-700 flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || isSaving}
            className="px-4 py-2 bg-amber-500 text-white text-sm font-bold rounded-xl disabled:opacity-50 flex items-center gap-1.5 hover:bg-amber-600 transition-colors"
          >
            {isSaving && <Loader2 size={12} className="animate-spin" />}
            Adjust Stock
          </button>
        </div>
      </div>
    </div>
  )
}
