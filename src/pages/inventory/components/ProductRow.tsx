import { useState } from 'react'
import { Edit, Trash2, Plus } from 'lucide-react'
import { formatCurrency } from '../../../lib/formatting-currency'
import { CATEGORY_COLORS } from '../constants'
import type { Product } from '../../../lib/types'

interface ProductRowProps {
  product: Product
  onEdit: () => void
  onRestock: () => void
  onDelete: () => void
  isDeleting: boolean
}

export const ProductRow: React.FC<ProductRowProps> = ({ product, onEdit, onRestock, onDelete, isDeleting }) => {
  const [showDelete, setShowDelete] = useState(false)
  const isLowStock = product.trackInventory && product.stockQuantity > 0 && product.stockQuantity <= product.lowStockThreshold
  const isOutOfStock = product.trackInventory && product.stockQuantity <= 0
  const color = product.categoryColor || CATEGORY_COLORS[(product.categoryName?.charCodeAt(0) ?? 0) % CATEGORY_COLORS.length]

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-bg-secondary dark:bg-bg-secondary border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 group transition-colors duration-200">
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {product.categoryName && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white whitespace-nowrap"
              style={{ backgroundColor: color + 'CC' }}>{product.categoryName}</span>
          )}
          <span className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{product.name}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {product.barcode && <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{product.barcode}</span>}
          {product.trackInventory && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              isOutOfStock
                ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300'
                : isLowStock
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300'
            }`}>{product.stockQuantity} {product.unit}</span>
          )}
        </div>
      </div>

      {/* Price */}
      <div className="text-right shrink-0">
        <span className="font-black text-sm text-brand-orange">{formatCurrency(product.sellingPrice)}</span>
        {product.costPrice > 0 && (
          <span className="text-[10px] text-slate-400 dark:text-slate-500 block">{formatCurrency(product.costPrice)} cost</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={onRestock} className="w-7 h-7 flex items-center justify-center text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors" title="Restock"><Plus size={13} /></button>
        <button onClick={onEdit} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:bg-orange-50 hover:text-brand-orange dark:hover:bg-slate-800 rounded-lg transition-colors" title="Edit"><Edit size={13} /></button>
        {showDelete ? (
          <div className="flex items-center gap-1">
            <button onClick={() => setShowDelete(false)} className="px-2 h-7 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 rounded-lg text-[10px] font-bold">Cancel</button>
            <button onClick={onDelete} disabled={isDeleting} className="px-2 h-7 bg-red-500 text-white rounded-lg text-[10px] font-bold disabled:opacity-50">{isDeleting ? '...' : 'Delete'}</button>
          </div>
        ) : (
          <button onClick={() => setShowDelete(true)} className="w-7 h-7 flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors" title="Delete"><Trash2 size={13} /></button>
        )}
      </div>
    </div>
  )
}
