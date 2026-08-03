import { useState } from 'react'
import { Info, X } from 'lucide-react'
import type { ProductFormState } from '../hooks/productFormMappers'
import type { ProductFormMode } from '../hooks/useProductForm'

interface AllowSingleUnitToggleProps {
  form: ProductFormState
  mode: ProductFormMode
  onToggle: () => void
}

export const AllowSingleUnitToggle: React.FC<AllowSingleUnitToggleProps> = ({ form, mode, onToggle }) => {
  const [showInfo, setShowInfo] = useState(false)
  const isBulk = mode === 'bulk'

  return (
    <div className="relative">
      <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-border-color dark:border-slate-700">
        {/* Toggle switch */}
        <button
          type="button"
          onClick={isBulk ? undefined : onToggle}
          disabled={isBulk}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
            form.allowSingleUnitSale ? 'bg-brand-orange' : 'bg-slate-300 dark:bg-slate-600'
          } ${isBulk ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            form.allowSingleUnitSale ? 'translate-x-5' : 'translate-x-1'
          }`} />
        </button>

        {/* Label */}
        <div className="flex-1">
          <p className="font-bold text-sm text-text-primary dark:text-slate-100">
            Allow single unit sale / Ruhusu uuzaji wa uniti moja
          </p>
          <p className="text-[10px] text-text-muted dark:text-slate-400">
            {isBulk
              ? 'Bulk item — sold in boxes only'
              : form.allowSingleUnitSale
                ? 'This item can be sold one at a time'
                : 'Sold via group/offer prices only'}
          </p>
        </div>

        {/* Info button — only in loose mode */}
        {!isBulk && (
          <button
            type="button"
            onClick={() => setShowInfo(s => !s)}
            className="text-slate-400 hover:text-brand-orange transition-colors shrink-0"
          >
            <Info size={15} />
          </button>
        )}
      </div>

      {/* Info popover */}
      {showInfo && (
        <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-xl border border-border-color dark:border-slate-600 bg-bg-card dark:bg-slate-800 shadow-xl p-3 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-bold text-text-primary dark:text-slate-100">Allow Single Unit Sale</p>
            <button onClick={() => setShowInfo(false)} className="text-slate-400 hover:text-slate-600">
              <X size={12} />
            </button>
          </div>
          <p className="text-text-muted dark:text-slate-400 leading-relaxed">
            When <strong>ON</strong>, this item can be sold individually at the selling price. In POS, a selection dialog will appear when group prices are also set.
          </p>
          <p className="text-text-muted dark:text-slate-400 leading-relaxed">
            When <strong>OFF</strong>, the item is sold using group/offer prices only — the individual selling price is ignored in POS.
          </p>
        </div>
      )}
    </div>
  )
}
