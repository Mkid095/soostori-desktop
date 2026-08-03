import { Package } from 'lucide-react'
import type { InventoryStats } from '../hooks/useInventoryState'

interface InventoryHeaderProps {
  stats: InventoryStats
}

export const InventoryHeader: React.FC<InventoryHeaderProps> = ({ stats }) => {
  return (
    <div className="bg-bg-secondary dark:bg-bg-secondary px-4 py-2.5 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 shrink-0 transition-colors duration-200">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-brand-orange rounded-lg flex items-center justify-center text-white">
          <Package size={14} />
        </div>
        <div>
          <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100">Stock</h1>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">{stats.total} products</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {stats.out > 0 && (
          <span className="px-2 py-0.5 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 rounded-full text-[10px] font-bold">
            {stats.out} out
          </span>
        )}
        {stats.low > 0 && (
          <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 rounded-full text-[10px] font-bold">
            {stats.low} low
          </span>
        )}
      </div>
    </div>
  )
}
