import { useState } from 'react'
import { X, ClipboardList, Check, Loader2 } from 'lucide-react'
import type { Product } from '../../../lib/types'

interface StockCountScreenProps {
  products: Product[]
  onCount: (counts: Array<{ productId: string; counted: number }>) => void
  onClose: () => void
  isSaving: boolean
}

interface CountEntry {
  productId: string
  counted: string
}

export const StockCountScreen: React.FC<StockCountScreenProps> = ({
  products, onCount, onClose, isSaving
}) => {
  const [counts, setCounts] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    products.forEach(p => { init[p.id] = '' })
    return init
  })

  const handleCountChange = (productId: string, value: string) => {
    setCounts(prev => ({ ...prev, [productId]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validCounts = Object.entries(counts)
      .map(([productId, counted]) => ({ productId, counted: parseInt(counted) || 0 }))
      .filter(c => c.counted >= 0)
    onCount(validCounts)
  }

  const totalProducts = products.length
  const enteredCount = Object.values(counts).filter(v => v !== '').length

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="shrink-0 px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-500 flex items-center justify-center shrink-0 text-white">
              <ClipboardList size={16} />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-800 dark:text-slate-100">Stock Count</h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                {enteredCount}/{totalProducts} products counted
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {products.map(product => {
              const variance = (parseInt(counts[product.id]) || 0) - product.stockQuantity
              return (
                <div key={product.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-100 truncate">
                      {product.name}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      System: {product.stockQuantity} {product.unit}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div>
                      <input
                        type="number"
                        min="0"
                        value={counts[product.id]}
                        onChange={e => handleCountChange(product.id, e.target.value)}
                        placeholder="Counted"
                        className="w-20 px-2.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-100 focus:border-violet-500 outline-none transition-colors text-center"
                      />
                    </div>
                    {counts[product.id] !== '' && (
                      <span className={`text-xs font-bold min-w-[60px] text-right ${
                        variance === 0
                          ? 'text-slate-400'
                          : variance > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {variance > 0 ? `+${variance}` : variance === 0 ? '✓' : variance}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </form>

        {/* Footer */}
        <div className="shrink-0 px-5 py-3.5 border-t border-slate-100 dark:border-slate-700 flex gap-2 justify-between items-center">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving || enteredCount === 0}
            className="px-4 py-2 bg-violet-500 text-white text-sm font-bold rounded-xl disabled:opacity-50 flex items-center gap-1.5 hover:bg-violet-600 transition-colors"
          >
            {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            Submit Count
          </button>
        </div>
      </div>
    </div>
  )
}
