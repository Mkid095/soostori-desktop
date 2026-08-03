import React from 'react'
import { Package, Tag } from 'lucide-react'
import type { Category, Product } from '../../../lib/types'

const COLORS = ['#F97316', '#22C55E', '#3B82F6', '#A855F7', '#EC4899', '#06B6D4', '#F59E0B']

interface POSCategoriesProps {
  categories: Category[]
  allProducts: Product[]
  selectedCategory: string | null
  onSelectCategory: (id: string | null) => void
}

const POSCategories: React.FC<POSCategoriesProps> = ({
  categories, allProducts, selectedCategory, onSelectCategory,
}) => (
  <div className="w-44 bg-bg-secondary dark:bg-bg-secondary border-r border-border-color dark:border-slate-700 flex flex-col shrink-0 transition-colors duration-200">
    <div className="px-3 py-2 border-b border-border-color dark:border-slate-700">
      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Categories</p>
    </div>
    <div className="flex-1 overflow-y-auto py-1.5 px-1.5">
      <button onClick={() => onSelectCategory(null)}
        className={`w-full text-left px-2.5 py-2 rounded-lg mb-0.5 flex items-center gap-2 transition-all ${
          selectedCategory === null
            ? 'bg-brand-orange text-white shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
        }`}>
        <Package size={13} className="shrink-0" />
        <span className="text-xs font-semibold truncate">All</span>
      </button>
      {categories.map((cat, i) => {
        const col = cat.color || COLORS[i % COLORS.length]
        const cnt = allProducts.filter((p: Product) => p.categoryId === cat.id && p.isActive).length
        return (
          <button key={cat.id} onClick={() => onSelectCategory(cat.id)}
            className={`w-full text-left px-2.5 py-2 rounded-lg mb-0.5 flex items-center gap-2 transition-all ${
              selectedCategory === cat.id
                ? 'text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
            style={selectedCategory === cat.id ? { backgroundColor: col } : {}}>
            <Tag size={13} className="shrink-0" style={selectedCategory !== cat.id ? { color: col } : {}} />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold truncate block">{cat.name}</span>
              <span className="text-[10px] opacity-60">{cnt}</span>
            </div>
          </button>
        )
      })}
    </div>
  </div>
)

export default POSCategories
