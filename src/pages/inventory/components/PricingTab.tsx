import { useState } from 'react'
import { Layers, Box } from 'lucide-react'
import { FormField } from '../../../components/shared/FormField'
import { GroupPricesEditor } from './GroupPricesEditor'

type PricingSubTab = 'loose' | 'bulk'

interface PricingTabProps {
  form: {
    costPrice: string; sellingPrice: string; allowSingleUnitSale: boolean
    unitsPerPackage: string; boxBuyingPrice: string; bulkSellingPrice: string
  }
  costPerUnit: number | null
  groupPrices: { quantity: number; price: number }[]
  initialTab?: PricingSubTab
  onFieldChange: (field: string, value: string) => void
  onBulkPriceChange: (field: 'unitsPerPackage' | 'boxBuyingPrice', value: string) => void
  onAllowSingleUnitSaleToggle: () => void
  onAddGroupPrice: () => void
  onUpdateGroupPrice: (i: number, field: 'quantity' | 'price', val: string) => void
  onRemoveGroupPrice: (i: number) => void
}

export const PricingTab: React.FC<PricingTabProps> = ({
  form, costPerUnit, groupPrices, initialTab = 'loose',
  onFieldChange, onBulkPriceChange, onAllowSingleUnitSaleToggle,
  onAddGroupPrice, onUpdateGroupPrice, onRemoveGroupPrice,
}) => {
  const [tab, setTab] = useState<PricingSubTab>(initialTab)

  return (
    <div className="space-y-4">
      <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
        {([
          { value: 'loose' as const, label: 'Unit Price', icon: Layers },
          { value: 'bulk' as const, label: 'Bulk / Box', icon: Box },
        ]).map(({ value, label, icon: Icon }) => (
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

      {tab === 'loose' ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Buying Price">
              <input type="number" step="0.01" value={form.costPrice}
                onChange={(e) => onFieldChange('costPrice', e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-border-color
                  dark:border-slate-600 rounded-xl py-2.5 px-3.5 font-semibold
                  text-text-primary dark:text-slate-100 focus:border-brand-orange
                  focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/30 outline-none"
                placeholder="0.00" />
            </FormField>
            <FormField label={`Selling Price ${form.allowSingleUnitSale ? '' : '(bulk only)'}`}
              required={form.allowSingleUnitSale}>
              <input type="number" step="0.01" value={form.sellingPrice}
                onChange={(e) => onFieldChange('sellingPrice', e.target.value)}
                disabled={!form.allowSingleUnitSale} required={form.allowSingleUnitSale}
                className={`w-full border rounded-xl py-2.5 px-3.5 font-semibold
                  focus:border-brand-orange focus:ring-2 focus:ring-orange-100
                  dark:focus:ring-orange-900/30 outline-none transition-all ${
                  form.allowSingleUnitSale
                    ? 'bg-white dark:bg-slate-800 border-border-color dark:border-slate-600 text-text-primary dark:text-slate-100'
                    : 'bg-slate-100 dark:bg-slate-900 border-border-color dark:border-slate-700 text-text-muted dark:text-slate-500 cursor-not-allowed'
                }`}
                placeholder={form.allowSingleUnitSale ? '0.00' : 'N/A — use bulk discounts'} />
            </FormField>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-border-color dark:border-slate-700">
            <button type="button" onClick={onAllowSingleUnitSaleToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${form.allowSingleUnitSale ? 'bg-brand-orange' : 'bg-slate-300 dark:bg-slate-600'}`}
              style={{ minWidth: '44px', minHeight: '24px' }}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.allowSingleUnitSale ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
            <div className="flex-1">
              <p className="font-bold text-sm text-text-primary dark:text-slate-100">Allow single unit sale</p>
              <p className="text-[10px] text-text-muted dark:text-slate-400">
                {form.allowSingleUnitSale
                  ? 'This item can be sold one at a time at the selling price above'
                  : 'This item is sold in bulk only — use bulk discounts for quantity pricing'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Units per Box/Package">
              <input type="number" value={form.unitsPerPackage}
                onChange={(e) => onBulkPriceChange('unitsPerPackage', e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-border-color
                  dark:border-slate-600 rounded-xl py-2.5 px-3.5 font-semibold
                  text-text-primary dark:text-slate-100 focus:border-brand-orange outline-none"
                placeholder="e.g. 24" />
            </FormField>
            <FormField label="Box Buying Price (KES)">
              <input type="number" step="0.01" value={form.boxBuyingPrice}
                onChange={(e) => onBulkPriceChange('boxBuyingPrice', e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-border-color
                  dark:border-slate-600 rounded-xl py-2.5 px-3.5 font-semibold
                  text-text-primary dark:text-slate-100 focus:border-brand-orange outline-none"
                placeholder="Cost of full box" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Cost per Unit (auto)">
              <div className="w-full bg-slate-100 dark:bg-slate-900 border border-border-color dark:border-slate-700 rounded-xl py-2.5 px-3.5 font-semibold text-text-muted dark:text-slate-400 text-center">
                {costPerUnit !== null ? `KES ${costPerUnit.toFixed(2)}` : '— calculated —'}
              </div>
            </FormField>
            <FormField label="Selling Price per Box (KES)">
              <input type="number" step="0.01" value={form.bulkSellingPrice}
                onChange={(e) => onFieldChange('bulkSellingPrice', e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-border-color
                  dark:border-slate-600 rounded-xl py-2.5 px-3.5 font-semibold
                  text-text-primary dark:text-slate-100 focus:border-brand-orange outline-none"
                placeholder="Price per full box" />
            </FormField>
          </div>
          <p className="text-[10px] text-text-muted dark:text-slate-400 italic">
            Cost per unit is calculated automatically from box price ÷ units.
          </p>
          <GroupPricesEditor groupPrices={groupPrices}
            onAdd={onAddGroupPrice} onUpdate={onUpdateGroupPrice}
            onRemove={onRemoveGroupPrice} />
        </div>
      )}
    </div>
  )
}
