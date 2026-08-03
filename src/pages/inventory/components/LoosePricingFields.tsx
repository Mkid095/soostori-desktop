import { Info, X } from 'lucide-react'
import { FormField } from '../../../components/shared/FormField'
import { GroupPricesEditor } from './GroupPricesEditor'
import type { ProductFormState } from '../hooks/productFormMappers'
import type { ProductFormMode } from '../hooks/useProductForm'

interface LoosePricingFieldsProps {
  form: ProductFormState
  groupPrices: { quantity: number; price: number }[]
  showSingleInfo: boolean
  onToggleSingleInfo: () => void
  onFieldChange: (field: string, value: string | boolean) => void
  onAddGroupPrice: () => void
  onUpdateGroupPrice: (i: number, field: 'quantity' | 'price', val: string) => void
  onRemoveGroupPrice: (i: number) => void
  mode: ProductFormMode
}

const inputClass = (disabled = false) =>
  `w-full bg-white dark:bg-slate-800 border border-border-color dark:border-slate-600
   rounded-xl py-2.5 px-3.5 font-semibold text-text-primary dark:text-slate-100
   focus:border-brand-orange focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/30
   outline-none transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`

export const LoosePricingFields: React.FC<LoosePricingFieldsProps> = ({
  form, groupPrices, showSingleInfo, onToggleSingleInfo,
  onFieldChange, onAddGroupPrice, onUpdateGroupPrice, onRemoveGroupPrice,
  mode,
}) => {
  const allowSingle = form.allowSingleUnitSale
  const isBulk = mode === 'bulk'
  const sell = parseFloat(form.sellingPrice) || 0
  const cost = parseFloat(form.costPrice) || 0
  const profit = sell - cost
  const margin = cost > 0 ? (profit / cost) * 100 : 0

  return (
    <div className="space-y-3">
      {/* Price row: buying | selling | toggle */}
      <div className="grid grid-cols-[1fr_1fr_44px] gap-2 items-end">
        <FormField label="Buying Price / Bei ya Kununua">
          <input type="number" step="0.01" value={form.costPrice}
            onChange={(e) => onFieldChange('costPrice', e.target.value)}
            className={inputClass()} placeholder="0.00" />
        </FormField>

        <FormField label="Selling Price / Bei ya Kuuzia" required>
          <input type="number" step="0.01" value={form.sellingPrice}
            disabled={!allowSingle}
            onChange={(e) => onFieldChange('sellingPrice', e.target.value)}
            className={inputClass(!allowSingle)} placeholder={allowSingle ? "0.00" : "—"} />
        </FormField>

        {/* Toggle + info column — 44px, vertically centered at bottom */}
        <div className="flex flex-col items-center justify-end gap-1.5 pb-1">
          <button type="button"
            title={isBulk ? 'Bulk item — sold in boxes only' : allowSingle ? 'Single unit sale: ON' : 'Single unit sale: OFF'}
            disabled={isBulk}
            onClick={() => !isBulk && onFieldChange('allowSingleUnitSale', !allowSingle)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
              allowSingle ? 'bg-brand-orange' : 'bg-slate-300 dark:bg-slate-600'
            } ${isBulk ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              allowSingle ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
          <button type="button" title={isBulk ? 'Bulk item — sold in boxes only' : 'What is single unit sale?'}
            onClick={isBulk ? undefined : onToggleSingleInfo}
            className={`transition-colors ${isBulk ? 'text-slate-300 dark:text-slate-600 cursor-default' : 'text-slate-400 hover:text-brand-orange'}`}>
            <Info size={13} />
          </button>
        </div>
      </div>

      {/* Single sale info popover */}
      {showSingleInfo && (
        <div className="w-full rounded-xl border border-border-color dark:border-slate-600
          bg-bg-card dark:bg-slate-800 shadow-xl p-3 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-bold text-text-primary dark:text-slate-100">Single Unit Sale</p>
            <button onClick={onToggleSingleInfo} className="text-slate-400 hover:text-slate-600">
              <X size={12} />
            </button>
          </div>
          <p className="text-text-muted dark:text-slate-400 leading-relaxed">
            When <strong>ON</strong>, this item can be sold individually at the selling price. In POS, a selection dialog will appear when group prices are also set.
          </p>
          <p className="text-text-muted dark:text-slate-400 leading-relaxed">
            When <strong>OFF</strong>, only group/offer prices apply — the individual selling price is ignored in POS.
          </p>
        </div>
      )}

      {/* Profit margin */}
      {allowSingle && sell > 0 && cost > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 dark:bg-slate-700/40
          rounded-xl border border-border-color dark:border-slate-600">
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Profit Margin
            </p>
            <p className="text-sm font-black text-green-600 dark:text-green-400">
              KES {profit.toFixed(2)}
              <span className="ml-2 text-xs font-semibold text-green-500 dark:text-green-500">
                (+{margin.toFixed(1)}%)
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Group prices */}
      <GroupPricesEditor
        groupPrices={groupPrices}
        onAdd={onAddGroupPrice}
        onUpdate={onUpdateGroupPrice}
        onRemove={onRemoveGroupPrice} />
    </div>
  )
}
