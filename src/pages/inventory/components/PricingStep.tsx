import { useState } from 'react'
import { Layers, Box } from 'lucide-react'
import { BulkPricingFields } from './BulkPricingFields'
import { LoosePricingFields } from './LoosePricingFields'
import { StockFields } from './StockFields'
import type { ProductFormMode } from '../hooks/useProductForm'
import type { ProductFormState } from '../hooks/productFormMappers'

interface PricingStepProps {
  mode: ProductFormMode
  form: ProductFormState
  costPerUnit: number | null
  groupPrices: { quantity: number; price: number }[]
  onFieldChange: (field: string, value: string | boolean) => void
  onBulkPriceChange: (field: 'unitsPerPackage' | 'boxBuyingPrice', value: string) => void
  onAddGroupPrice: () => void
  onUpdateGroupPrice: (i: number, field: 'quantity' | 'price', val: string) => void
  onRemoveGroupPrice: (i: number) => void
}

export const PricingStep: React.FC<PricingStepProps> = ({
  mode, form, costPerUnit, groupPrices,
  onFieldChange, onBulkPriceChange,
  onAddGroupPrice, onUpdateGroupPrice, onRemoveGroupPrice,
}) => {
  const [tab, setTab] = useState<'loose' | 'bulk'>(mode)
  const [showSingleInfo, setShowSingleInfo] = useState(false)
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
          showSingleInfo={showSingleInfo}
          onToggleSingleInfo={() => setShowSingleInfo(s => !s)}
          onFieldChange={onFieldChange}
          onAddGroupPrice={onAddGroupPrice}
          onUpdateGroupPrice={onUpdateGroupPrice}
          onRemoveGroupPrice={onRemoveGroupPrice}
          mode={mode}
        />
      )}

      {showBulk && (
        <BulkPricingFields form={form} costPerUnit={costPerUnit} groupPrices={groupPrices}
          onFieldChange={onFieldChange} onBulkPriceChange={onBulkPriceChange}
          onAddGroupPrice={onAddGroupPrice} onUpdateGroupPrice={onUpdateGroupPrice}
          onRemoveGroupPrice={onRemoveGroupPrice} />
      )}

      <StockFields form={form} onFieldChange={onFieldChange} />
    </div>
  )
}
