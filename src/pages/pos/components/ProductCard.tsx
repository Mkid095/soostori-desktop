import React from 'react'
import type { Product } from '../../../lib/types'
import { formatCurrency } from '../../../lib/formatting-currency'

interface ProductCardProps {
  product: Product
  onTap: () => void
}

const ProductCard = React.memo<ProductCardProps>(({ product, onTap }) => {
  const out = product.trackInventory && product.stockQuantity <= 0
  const low = product.trackInventory && product.stockQuantity > 0 && product.stockQuantity <= product.lowStockThreshold

  return (
    <button
      onClick={onTap}
      disabled={out}
      className={`p-2.5 rounded-xl border text-left transition-[border-color,box-shadow,transform,background-color] duration-150 active:scale-[0.96] ${
        out
          ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 opacity-50 cursor-not-allowed'
          : 'bg-bg-card dark:bg-slate-800 border-border-color dark:border-slate-700 hover:border-brand-orange/60 hover:shadow-md hover:-translate-y-0.5'
      }`}
    >
      <div className="flex justify-between items-start gap-1">
        <span className={`font-semibold text-xs leading-tight flex-1 truncate ${out ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>
          {product.name}
        </span>
        <span className={`font-black text-xs whitespace-nowrap ${out ? 'text-slate-400 dark:text-slate-500' : 'text-brand-orange'}`}>
          {formatCurrency(product.sellingPrice)}
        </span>
      </div>
      {product.trackInventory && (
        <div className="mt-1">
          {out ? (
            <span className="text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 rounded">Out</span>
          ) : low ? (
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded">
              {product.stockQuantity} left
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">{product.stockQuantity} in stock</span>
          )}
        </div>
      )}
    </button>
  )
})

export default ProductCard
