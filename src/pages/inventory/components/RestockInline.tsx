import { useState } from 'react'
import { X, Check, Loader2 } from 'lucide-react'
import { RESTOCK_REASONS } from '../constants'
import type { Product } from '../../../lib/types'

interface RestockInlineProps {
  product: Product
  onSave: (qtyChange: number, reason: string, newBuyPrice?: number, newSellPrice?: number) => void
  onCancel: () => void
  isSaving: boolean
}

export const RestockInline: React.FC<RestockInlineProps> = ({ product, onSave, onCancel, isSaving }) => {
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('Restock')
  const [newBuyPrice, setNewBuyPrice] = useState(String(product.costPrice || 0))
  const [newSellPrice, setNewSellPrice] = useState(String(product.sellingPrice || 0))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const qty = parseInt(quantity)
    if (isNaN(qty) || qty <= 0) return
    onSave(qty, reason, parseFloat(newBuyPrice), parseFloat(newSellPrice))
  }

  const newStock = product.stockQuantity + (parseInt(quantity) || 0)

  return (
    <div className="bg-blue-50 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/50 px-4 py-3 transition-colors duration-200">
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-xs text-blue-700 dark:text-blue-300">Restock: {product.name}</span>
        <button onClick={onCancel} className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg text-blue-400"><X size={12} /></button>
      </div>
      <form onSubmit={handleSubmit} className="flex items-end gap-2 flex-wrap">
        <div>
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5 block">Qty to Add *</label>
          <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required
            className="w-24 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-lg py-1.5 px-2.5 text-sm font-bold text-slate-700 dark:text-slate-100 focus:border-blue-500 outline-none transition-colors"
            autoFocus />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5 block">Reason</label>
          <select value={reason} onChange={(e) => setReason(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-lg py-1.5 px-2 text-xs font-semibold text-slate-700 dark:text-slate-100 focus:border-blue-500 outline-none transition-colors">
            {RESTOCK_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5 block">Buy Price</label>
          <input type="number" step="0.01" value={newBuyPrice} onChange={(e) => setNewBuyPrice(e.target.value)}
            className="w-20 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-lg py-1.5 px-2 text-xs font-semibold text-slate-700 dark:text-slate-100 focus:border-blue-500 outline-none transition-colors" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5 block">Sell Price</label>
          <input type="number" step="0.01" value={newSellPrice} onChange={(e) => setNewSellPrice(e.target.value)}
            className="w-20 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-lg py-1.5 px-2 text-xs font-semibold text-slate-700 dark:text-slate-100 focus:border-blue-500 outline-none transition-colors" />
        </div>
        {quantity && (
          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/40 px-2.5 py-1.5 rounded-lg whitespace-nowrap">
            → {newStock} {product.unit}
          </div>
        )}
        <button type="submit" disabled={isSaving || !quantity}
          className="py-1.5 px-4 bg-blue-500 text-white rounded-lg font-bold text-xs disabled:opacity-50 flex items-center gap-1">
          {isSaving ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}Save
        </button>
      </form>
    </div>
  )
}
