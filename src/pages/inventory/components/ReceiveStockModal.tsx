import { useState } from 'react'
import { X, PackageSearch, Plus, Loader2 } from 'lucide-react'
import type { Product } from '../../../lib/types'

interface ReceiveStockModalProps {
  products: Product[]
  onReceive: (data: { productId: string; quantity: number; supplier?: string; notes?: string }) => void
  onClose: () => void
  isSaving: boolean
}

export const ReceiveStockModal: React.FC<ReceiveStockModalProps> = ({
  products, onReceive, onClose, isSaving
}) => {
  const [selectedProductId, setSelectedProductId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [supplier, setSupplier] = useState('')
  const [notes, setNotes] = useState('')

  const selectedProduct = products.find(p => p.id === selectedProductId)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProductId || !quantity) return
    onReceive({
      productId: selectedProductId,
      quantity: parseInt(quantity),
      supplier: supplier || undefined,
      notes: notes || undefined,
    })
  }

  const isValid = selectedProductId && quantity && parseInt(quantity) > 0

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-xl flex flex-col">
        {/* Header */}
        <div className="shrink-0 px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0 text-white">
              <Plus size={16} />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-800 dark:text-slate-100">Receive Stock</h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Record incoming inventory</p>
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
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-100 focus:border-brand-orange outline-none transition-colors appearance-none"
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

          {/* Quantity */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5 block">
              Quantity Received *
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              required
              placeholder="e.g. 50"
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-100 focus:border-brand-orange outline-none transition-colors"
              autoFocus
            />
            {quantity && selectedProduct && (
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
                New stock: {selectedProduct.stockQuantity + parseInt(quantity || '0')} {selectedProduct.unit}
              </p>
            )}
          </div>

          {/* Supplier */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5 block">
              Supplier
            </label>
            <input
              type="text"
              value={supplier}
              onChange={e => setSupplier(e.target.value)}
              placeholder="e.g. Kenya Wholesalers Ltd"
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-100 focus:border-brand-orange outline-none transition-colors"
            />
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
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-100 focus:border-brand-orange outline-none transition-colors resize-none"
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
            className="px-4 py-2 bg-brand-orange text-white text-sm font-bold rounded-xl disabled:opacity-50 flex items-center gap-1.5 hover:bg-orange-600 transition-colors"
          >
            {isSaving && <Loader2 size={12} className="animate-spin" />}
            Receive Stock
          </button>
        </div>
      </div>
    </div>
  )
}
