import { FormField } from '../../../components/shared/FormField'
import { GroupPricesEditor } from './GroupPricesEditor'
import type { ProductFormState } from '../hooks/productFormMappers'

interface BulkPricingFieldsProps {
  form: ProductFormState
  costPerUnit: number | null
  groupPrices: { quantity: number; price: number }[]
  onFieldChange: (field: string, value: string) => void
  onBulkPriceChange: (field: 'unitsPerPackage' | 'boxBuyingPrice', value: string) => void
  onAddGroupPrice: () => void
  onUpdateGroupPrice: (i: number, field: 'quantity' | 'price', val: string) => void
  onRemoveGroupPrice: (i: number) => void
}

export const BulkPricingFields: React.FC<BulkPricingFieldsProps> = ({
  form, costPerUnit, groupPrices,
  onFieldChange, onBulkPriceChange,
  onAddGroupPrice, onUpdateGroupPrice, onRemoveGroupPrice,
}) => {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Units per Box / Uniti kwa Box">
          <input
            type="number"
            value={form.unitsPerPackage}
            onChange={(e) => onBulkPriceChange('unitsPerPackage', e.target.value)}
            className="w-full bg-white dark:bg-slate-800 border border-border-color
              dark:border-slate-600 rounded-xl py-2.5 px-3.5 font-semibold
              text-text-primary dark:text-slate-100 focus:border-brand-orange outline-none"
            placeholder="e.g. 24"
          />
        </FormField>
        <FormField label="Box Buying Price / Bei ya Box">
          <input
            type="number"
            step="0.01"
            value={form.boxBuyingPrice}
            onChange={(e) => onBulkPriceChange('boxBuyingPrice', e.target.value)}
            className="w-full bg-white dark:bg-slate-800 border border-border-color
              dark:border-slate-600 rounded-xl py-2.5 px-3.5 font-semibold
              text-text-primary dark:text-slate-100 focus:border-brand-orange outline-none"
            placeholder="Cost of full box"
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Cost per Unit (auto) / Gharama kwa Uniti">
          <div className="w-full bg-slate-100 dark:bg-slate-900 border border-border-color
            dark:border-slate-700 rounded-xl py-2.5 px-3.5 font-semibold
            text-text-muted dark:text-slate-400 text-center">
            {costPerUnit !== null ? `KES ${costPerUnit.toFixed(2)}` : '— calculated —'}
          </div>
        </FormField>
        <FormField label="Selling Price per Box / Bei ya Kuuzia Box">
          <input
            type="number"
            step="0.01"
            value={form.bulkSellingPrice}
            onChange={(e) => onFieldChange('bulkSellingPrice', e.target.value)}
            className="w-full bg-white dark:bg-slate-800 border border-border-color
              dark:border-slate-600 rounded-xl py-2.5 px-3.5 font-semibold
              text-text-primary dark:text-slate-100 focus:border-brand-orange outline-none"
            placeholder="Price per full box"
          />
        </FormField>
      </div>

      <p className="text-[10px] text-text-muted dark:text-slate-400 italic">
        Cost per unit is calculated automatically from box price ÷ units.
      </p>

      <GroupPricesEditor
        groupPrices={groupPrices}
        onAdd={onAddGroupPrice}
        onUpdate={onUpdateGroupPrice}
        onRemove={onRemoveGroupPrice}
      />
    </div>
  )
}
