import { useState } from 'react'
import { Info, X } from 'lucide-react'
import { FormField } from '../../../components/shared/FormField'
import type { ProductFormState } from '../hooks/productFormMappers'

interface StockFieldsProps {
  form: ProductFormState
  onFieldChange: (field: string, value: string | boolean) => void
}

const inputClass = (disabled = false) =>
  `w-full bg-white dark:bg-slate-800 border border-border-color dark:border-slate-600
   rounded-xl py-2.5 px-3.5 font-semibold text-text-primary dark:text-slate-100
   focus:border-brand-orange focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/30
   outline-none transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`

export const StockFields: React.FC<StockFieldsProps> = ({ form, onFieldChange }) => {
  const [showInfo, setShowInfo] = useState(false)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Opening Stock / Kiasi cha Hisa">
          <input type="number" min="0" value={form.stockQuantity}
            onChange={(e) => onFieldChange('stockQuantity', e.target.value)}
            className={inputClass()} placeholder="0" />
        </FormField>

        {/* Low stock alert — disabled when track inventory is off */}
        <div className="relative">
          <FormField label="Low Stock Alert / Tahadhari">
            <input type="number" min="0"
              value={form.lowStockThreshold}
              disabled={!form.trackInventory}
              onChange={(e) => onFieldChange('lowStockThreshold', e.target.value)}
              className={inputClass(!form.trackInventory)}
              placeholder={form.trackInventory ? "10" : "—"} />
          </FormField>
          <button type="button"
            onClick={() => setShowInfo(s => !s)}
            className="absolute right-2 top-[34px] text-slate-400 hover:text-brand-orange transition-colors z-10">
            <Info size={13} />
          </button>
        </div>
      </div>

      {/* Track inventory info popover */}
      {showInfo && (
        <div className="w-full rounded-xl border border-border-color dark:border-slate-600
          bg-bg-card dark:bg-slate-800 shadow-xl p-3 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-bold text-text-primary dark:text-slate-100">Track Inventory</p>
            <button onClick={() => setShowInfo(false)} className="text-slate-400 hover:text-slate-600">
              <X size={12} />
            </button>
          </div>
          <p className="text-text-muted dark:text-slate-400 leading-relaxed">
            When <strong>ON</strong>, this product's stock is monitored. You'll receive low-stock alerts when quantity falls below the threshold.
          </p>
          <p className="text-text-muted dark:text-slate-400 leading-relaxed">
            When <strong>OFF</strong>, no stock alerts are triggered for this product — useful for services or non-inventory items.
          </p>
        </div>
      )}

      {/* Track inventory toggle */}
      <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-border-color dark:border-slate-700">
        <button type="button"
          onClick={() => onFieldChange('trackInventory', !form.trackInventory)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
            form.trackInventory ? 'bg-brand-orange' : 'bg-slate-300 dark:bg-slate-600'
          }`}
          style={{ minWidth: '44px', minHeight: '24px' }}>
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            form.trackInventory ? 'translate-x-5' : 'translate-x-1'
          }`} />
        </button>
        <div className="flex-1">
          <p className="font-bold text-sm text-text-primary dark:text-slate-100">Track Inventory / Fuatilia Hisa</p>
          <p className="text-[10px] text-text-muted dark:text-slate-400">
            {form.trackInventory ? 'Stock is being monitored' : 'Stock tracking is disabled'}
          </p>
        </div>
        <button type="button"
          onClick={() => setShowInfo(s => !s)}
          className="text-slate-400 hover:text-brand-orange transition-colors shrink-0">
          <Info size={14} />
        </button>
      </div>
    </div>
  )
}
