import { useState } from 'react'
import { Info, X } from 'lucide-react'
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
  onFieldChange: (field: string, value: string | boolean) => void
  onBulkPriceChange: (field: 'unitsPerPackage' | 'boxBuyingPrice', value: string) => void
  onAllowSingleUnitSaleToggle: () => void
  onAddGroupPrice: () => void
  onUpdateGroupPrice: (i: number, field: 'quantity' | 'price', val: string) => void
  onRemoveGroupPrice: (i: number) => void
}

const inputClass = (disabled = false) =>
  `w-full bg-white dark:bg-slate-800 border border-border-color dark:border-slate-600
   rounded-xl py-2.5 px-3.5 font-semibold text-text-primary dark:text-slate-100
   focus:border-brand-orange focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/30
   outline-none transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`

export const PricingStep: React.FC<PricingStepProps> = ({
  mode, form, costPerUnit, groupPrices,
  onFieldChange, onBulkPriceChange, onAllowSingleUnitSaleToggle,
  onAddGroupPrice, onUpdateGroupPrice, onRemoveGroupPrice,
}) => {
  const [tab, setTab] = useState<'loose' | 'bulk'>(mode)
  const [showTrackInfo, setShowTrackInfo] = useState(false)
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
        <LoosePricingFields
          form={form}
          groupPrices={groupPrices}
          onFieldChange={onFieldChange}
          onAddGroupPrice={onAddGroupPrice}
          onUpdateGroupPrice={onUpdateGroupPrice}
          onRemoveGroupPrice={onRemoveGroupPrice}
        />
      )}

      {showBulk && (
        <BulkPricingFields form={form} costPerUnit={costPerUnit} groupPrices={groupPrices}
          onFieldChange={onFieldChange} onBulkPriceChange={onBulkPriceChange}
          onAddGroupPrice={onAddGroupPrice} onUpdateGroupPrice={onUpdateGroupPrice}
          onRemoveGroupPrice={onRemoveGroupPrice} />
      )}

      {/* Stock fields */}
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
            {/* Info icon */}
            <button
              type="button"
              onClick={() => setShowTrackInfo(s => !s)}
              className="absolute right-2 top-[34px] text-slate-400 hover:text-brand-orange transition-colors z-10"
            >
              <Info size={13} />
            </button>
          </div>
        </div>

        {/* Track inventory toggle */}
        <div className="relative">
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
          </div>

          {/* Track inventory info popover */}
          {showTrackInfo && (
            <div className="absolute left-0 top-full mt-2 z-50 w-64 rounded-xl border border-border-color dark:border-slate-600 bg-bg-card dark:bg-slate-800 shadow-xl p-3 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-bold text-text-primary dark:text-slate-100">Track Inventory</p>
                <button onClick={() => setShowTrackInfo(false)} className="text-slate-400 hover:text-slate-600">
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
        </div>
      </div>

      <AllowSingleUnitToggle
        form={form}
        mode={mode}
        onToggle={onAllowSingleUnitSaleToggle}
      />
    </div>
  )
}

const LoosePricingFields: React.FC<{
  form: ProductFormState
  groupPrices: { quantity: number; price: number }[]
  onFieldChange: (field: string, value: string | boolean) => void
  onAddGroupPrice: () => void
  onUpdateGroupPrice: (i: number, field: 'quantity' | 'price', val: string) => void
  onRemoveGroupPrice: (i: number) => void
}> = ({ form, groupPrices, onFieldChange, onAddGroupPrice, onUpdateGroupPrice, onRemoveGroupPrice }) => {
  const allowSingle = form.allowSingleUnitSale
  const sell = parseFloat(form.sellingPrice) || 0
  const cost = parseFloat(form.costPrice) || 0
  const profit = sell - cost
  const margin = cost > 0 ? (profit / cost) * 100 : 0

  return (
    <div className="space-y-3">
      {/* Buying + Selling price row */}
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Buying Price / Bei ya Kununua">
          <input
            type="number" step="0.01"
            value={form.costPrice}
            onChange={(e) => onFieldChange('costPrice', e.target.value)}
            className={inputClass()} placeholder="0.00" />
        </FormField>
        <FormField label="Selling Price / Bei ya Kuuzia" required>
          <input
            type="number" step="0.01"
            value={form.sellingPrice}
            disabled={!allowSingle}
            onChange={(e) => onFieldChange('sellingPrice', e.target.value)}
            className={inputClass(!allowSingle)} placeholder={allowSingle ? "0.00" : "—"} />
        </FormField>
      </div>

      {/* Profit margin — shown when toggle is on and both prices are filled */}
      {allowSingle && sell > 0 && cost > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-border-color dark:border-slate-600">
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
