import type { ProductFormMode } from '../hooks/useProductForm'
import { PricingTab } from './PricingTab'

interface ProductFormPricingProps {
  mode: ProductFormMode
  form: {
    costPrice: string; sellingPrice: string; allowSingleUnitSale: boolean
    unitsPerPackage: string; boxBuyingPrice: string; bulkSellingPrice: string
  }
  costPerUnit: number | null
  groupPrices: { quantity: number; price: number }[]
  onFieldChange: (field: string, value: string) => void
  onBulkPriceChange: (field: 'unitsPerPackage' | 'boxBuyingPrice', value: string) => void
  onAllowSingleUnitSaleToggle: () => void
  onAddGroupPrice: () => void
  onUpdateGroupPrice: (i: number, field: 'quantity' | 'price', val: string) => void
  onRemoveGroupPrice: (i: number) => void
}

export const ProductFormPricing: React.FC<ProductFormPricingProps> = ({
  mode, form, costPerUnit, groupPrices,
  onFieldChange, onBulkPriceChange, onAllowSingleUnitSaleToggle,
  onAddGroupPrice, onUpdateGroupPrice, onRemoveGroupPrice,
}) => {
  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-border-color dark:border-slate-700">
      <p className="text-xs font-bold text-text-muted dark:text-slate-400 uppercase tracking-wider mb-3">Pricing</p>
      <PricingTab
        form={form} costPerUnit={costPerUnit} groupPrices={groupPrices}
        initialTab={mode}
        onFieldChange={onFieldChange} onBulkPriceChange={onBulkPriceChange}
        onAllowSingleUnitSaleToggle={onAllowSingleUnitSaleToggle}
        onAddGroupPrice={onAddGroupPrice} onUpdateGroupPrice={onUpdateGroupPrice}
        onRemoveGroupPrice={onRemoveGroupPrice}
      />
    </div>
  )
}
