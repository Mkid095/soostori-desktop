import { useState } from 'react'
import { Layers, Box } from 'lucide-react'
import { FormField } from '../../../components/shared/FormField'
import { BulkPricingFields } from './BulkPricingFields'
import { AllowSingleUnitToggle } from './AllowSingleUnitToggle'
import { GroupPricesEditor } from './GroupPricesEditor'
import type { ProductFormMode } from '../hooks/useProductForm'
import type { ProductFormState } from '../hooks/productFormMappers'

interface PricingStepProps {
  mode: ProductFormMode
  form: ProductFormState
  costPerUnit: number | null
  groupPrices: { quantity: number; price: number }[]
  onFieldChange: (field: string, value: string) => void
  onBulkPriceChange: (field: 'unitsPerPackage' | 'boxBuyingPrice', value: string) => void
  onAllowSingleUnitSaleToggle: () => void
  onAddGroupPrice: () => void
  onUpdateGroupPrice: (i: number, field: 'quantity' | 'price', val: string) => void
  onRemoveGroupPrice: (i: number) => void
}

const inputClass = "w-full bg-white dark:bg-slate-800 border border-border-color dark:border-slate-600 rounded-xl py-2.5 px-3.5 font-semibold text-text-primary dark:text-slate-100 focus:border-brand-orange focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/30 outline-none"

export const PricingStep: React.FC<PricingStepProps> = ({
  mode, form, costPerUnit, groupPrices,
  onFieldChange, onBulkPriceChange, onAllowSingleUnitSaleToggle,
  onAddGroupPrice, onUpdateGroupPrice, onRemoveGroupPrice,
}) => {
  const [tab, setTab] = useState<'loose' | 'bulk'>(mode)

  const showLoose = mode === 'loose' || tab === 'loose'
  const showBulk = mode === 'bulk' && tab === 'bulk'

  return (
    <div className="pt-2 pb-2 space-y-4">
      <div className="text-center pb-1">
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
          Pricing & Stock / Bei na Hisa
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Set prices and stock levels</p>
      </div>

      {mode === 'bulk' && (
        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          {([
            { value: 'loose' as const, label: 'Unit Price', icon: Layers },
            { value: 'bulk' as const, label: 'Bulk / Box', icon: Box },
          ] as const).map(({ value, label, icon: Icon }) => (
            <button key={value} type="button" onClick={() => setTab(value)}
              className={`flex-1 py-2 rounded-lg font-bold text-xs flex items-center
                justify-center gap-1.5 transition-all ${
                tab === value
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}>
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      )}

      {showLoose && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Buying Price / Bei ya Kununua">
              <input type="number" step="0.01" value={form.costPrice}
                onChange={(e) => onFieldChange('costPrice', e.target.value)}
                className={inputClass} placeholder="0.00" />
            </FormField>
            <FormField label="Selling Price / Bei ya Kuuzia" required>
              <input type="number" step="0.01" value={form.sellingPrice}
                onChange={(e) => onFieldChange('sellingPrice', e.target.value)}
                className={inputClass} placeholder="0.00" />
            </FormField>
          </div>
          <GroupPricesEditor groupPrices={groupPrices}
            onAdd={onAddGroupPrice} onUpdate={onUpdateGroupPrice}
            onRemove={onRemoveGroupPrice} />
        </div>
      )}

      {showBulk && (
        <BulkPricingFields form={form} costPerUnit={costPerUnit} groupPrices={groupPrices}
          onFieldChange={onFieldChange} onBulkPriceChange={onBulkPriceChange}
          onAddGroupPrice={onAddGroupPrice} onUpdateGroupPrice={onUpdateGroupPrice}
          onRemoveGroupPrice={onRemoveGroupPrice} />
      )}

      {/* Stock fields — shown in both loose and bulk modes */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Opening Stock / Kiasi cha Hisa">
            <input type="number" min="0" value={form.stockQuantity}
              onChange={(e) => onFieldChange('stockQuantity', e.target.value)}
              className={inputClass} placeholder="0" />
          </FormField>
          <FormField label="Low Stock Alert / Tahadhari">
            <input type="number" min="0" value={form.lowStockThreshold}
              onChange={(e) => onFieldChange('lowStockThreshold', e.target.value)}
              className={inputClass} placeholder="10" />
          </FormField>
        </div>
        <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-border-color dark:border-slate-700">
          <button type="button"
            onClick={() => onFieldChange('trackInventory', !form.trackInventory as any)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
              form.trackInventory ? 'bg-brand-orange' : 'bg-slate-300 dark:bg-slate-600'
            }`}
            style={{ minWidth: '44px', minHeight: '24px' }}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              form.trackInventory ? 'translate-x-5' : 'translate-x-1'
            }`} />
          </button>
          <div>
            <p className="font-bold text-sm text-text-primary dark:text-slate-100">Track Inventory / Fuatilia Hisa</p>
            <p className="text-[10px] text-text-muted dark:text-slate-400">Monitor stock and get low-stock alerts</p>
          </div>
        </div>
      </div>

      <AllowSingleUnitToggle form={form} onToggle={onAllowSingleUnitSaleToggle} />
    </div>
  )
}
