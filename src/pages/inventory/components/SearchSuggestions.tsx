import { useEffect, useRef } from 'react'
import type { Product } from '../../../lib/types'

interface SearchSuggestionsProps {
  suggestions: Product[]
  searchTerm: string
  onSelect: (product: Product) => void
  onClear: () => void
}

export const SearchSuggestions: React.FC<SearchSuggestionsProps> = ({
  suggestions, searchTerm, onSelect, onClear
}) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClear()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClear])

  if (suggestions.length === 0 || searchTerm.length === 0) return null
  return (
    <div ref={containerRef} className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 overflow-hidden">
      {suggestions.map((p) => (
        <button key={p.id} onClick={() => onSelect(p)}
          className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-0 transition-colors">
          <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">{p.name}</div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
            {p.barcode || 'No barcode'} &middot; Stock: {p.trackInventory ? p.stockQuantity : 'N/A'}
          </div>
        </button>
      ))}
    </div>
  )
}
