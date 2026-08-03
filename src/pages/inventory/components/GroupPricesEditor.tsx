import { Plus, Minus } from 'lucide-react'

interface GroupPricesEditorProps {
  groupPrices: { quantity: number; price: number }[]
  onAdd: () => void
  onUpdate: (i: number, field: 'quantity' | 'price', val: string) => void
  onRemove: (i: number) => void
}

export const GroupPricesEditor: React.FC<GroupPricesEditorProps> = ({
  groupPrices, onAdd, onUpdate, onRemove
}) => {
  return (
    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-900/40">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Bulk Discounts</p>
          <p className="text-[10px] text-amber-500 dark:text-amber-500/80 mt-0.5">e.g. "Buy 3 for Kes 100"</p>
        </div>
        <button type="button" onClick={onAdd}
          className="px-3 py-1.5 bg-amber-200 dark:bg-amber-800/50 text-amber-800
            dark:text-amber-200 rounded-lg font-bold text-xs hover:bg-amber-300
            dark:hover:bg-amber-800 flex items-center gap-1">
          <Plus size={12} /> Add
        </button>
      </div>
      {groupPrices.map((gp, i) => (
        <div key={i} className="flex items-center gap-2 mb-2">
          <input type="number" min="1" value={gp.quantity}
            onChange={(e) => onUpdate(i, 'quantity', e.target.value)}
            className="w-20 bg-white dark:bg-slate-800 border border-amber-200
              dark:border-amber-900/40 rounded-lg py-2 px-2 text-sm font-semibold
              text-text-primary dark:text-slate-100 outline-none
              focus:border-amber-500"
            placeholder="Qty" />
          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">for</span>
          <input type="number" step="0.01" value={gp.price}
            onChange={(e) => onUpdate(i, 'price', e.target.value)}
            className="flex-1 bg-white dark:bg-slate-800 border border-amber-200
              dark:border-amber-900/40 rounded-lg py-2 px-2 text-sm font-semibold
              text-text-primary dark:text-slate-100 outline-none
              focus:border-amber-500"
            placeholder="Price" />
          <button type="button" onClick={() => onRemove(i)}
            className="w-7 h-7 flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg">
            <Minus size={14} />
          </button>
        </div>
      ))}
      {groupPrices.length === 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold italic">No bulk discounts added yet</p>
      )}
    </div>
  )
}
