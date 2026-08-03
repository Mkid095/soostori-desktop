import { Package, RefreshCw } from 'lucide-react'
import type { Product } from '../../../lib/types'
import { ProductRow } from './ProductRow'

interface ProductListProps {
  products: Product[]
  isLoading: boolean
  onEdit: (p: Product) => void
  onRestock: (p: Product) => void
  onDelete: (id: string) => void
  isDeleting: boolean
}

export const ProductList: React.FC<ProductListProps> = ({
  products, isLoading, onEdit, onRestock, onDelete, isDeleting
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 animate-spin text-brand-orange" />
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500 transition-colors duration-200">
        <Package size={36} className="mb-2 opacity-40" />
        <p className="font-bold text-sm">No products found</p>
        <p className="text-xs mt-0.5">Add products or adjust search</p>
      </div>
    )
  }

  return (
    <div>
      {products.map((product) => (
        <ProductRow
          key={product.id}
          product={product}
          onEdit={() => onEdit(product)}
          onRestock={() => onRestock(product)}
          onDelete={() => onDelete(product.id)}
          isDeleting={isDeleting}
        />
      ))}
    </div>
  )
}
