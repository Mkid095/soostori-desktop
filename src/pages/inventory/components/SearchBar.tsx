import { Search, Plus } from 'lucide-react'
import type { Category, Product } from '../../../lib/types'
import { SearchSuggestions } from './SearchSuggestions'

interface SearchBarProps {
  searchTerm: string
  categoryFilter: string
  categories: Category[]
  suggestions: Product[]
  onSearchChange: (v: string) => void
  onCategoryChange: (v: string) => void
  onAddClick: () => void
  onSelectSuggestion: (product: Product) => void
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchTerm, categoryFilter, categories, suggestions,
  onSearchChange, onCategoryChange, onAddClick, onSelectSuggestion
}) => {
  return (
    <div className="px-4 py-2 bg-bg-secondary dark:bg-bg-secondary border-b border-slate-100 dark:border-slate-700 flex items-center gap-2 shrink-0 transition-colors duration-200">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
        <input type="text" placeholder="Search name, barcode, SKU..."
          value={searchTerm} onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-2 pl-8 pr-3
            text-xs font-semibold focus:border-brand-orange outline-none text-slate-800 dark:text-slate-100 transition-colors duration-200"
        />
        <SearchSuggestions
          suggestions={suggestions}
          searchTerm={searchTerm}
          onSelect={onSelectSuggestion}
          onClear={() => onSearchChange('')}
        />
      </div>
      <select value={categoryFilter}
        onChange={(e) => onCategoryChange(e.target.value)}
        className="px-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg
          text-xs font-semibold focus:border-brand-orange outline-none text-slate-600 dark:text-slate-300 transition-colors duration-200">
        <option value="ALL">All</option>
        {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
      </select>
      <button onClick={onAddClick}
        className="px-3 py-2 bg-brand-orange text-white rounded-lg font-bold text-xs
          hover:bg-orange-600 transition-colors flex items-center gap-1 shrink-0">
        <Plus size={12} /> Add
      </button>
    </div>
  )
}
