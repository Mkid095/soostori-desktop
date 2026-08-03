import { FormField } from '../../../components/shared/FormField'
import type { ProductFormState } from '../hooks/productFormMappers'

interface StockStepProps {
  form: ProductFormState
  onFieldChange: <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => void
}

const inputClass = "w-full bg-white dark:bg-slate-800 border border-border-color dark:border-slate-600 rounded-xl py-2.5 px-3.5 font-semibold text-text-primary dark:text-slate-100 focus:border-brand-orange focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/30 outline-none"

export const StockStep: React.FC<StockStepProps> = ({ form, onFieldChange }) => {
  return (
    <div className="pt-2 pb-2 space-y-4">
      <div className="text-center pb-2">
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
          Stock & Distributor / Hisa na Msambazaji
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Set opening stock levels and supplier information
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Opening Stock / Kiasi cha Hisa">
          <input
            type="number" min="0" value={form.stockQuantity}
            onChange={(e) => onFieldChange('stockQuantity', e.target.value)}
            className={inputClass} placeholder="0" />
        </FormField>
        <FormField label="Low Stock Alert / Tahadhari">
          <input
            type="number" min="0" value={form.lowStockThreshold}
            onChange={(e) => onFieldChange('lowStockThreshold', e.target.value)}
            className={inputClass} placeholder="10" />
        </FormField>
      </div>

      <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-border-color dark:border-slate-700">
        <button
          type="button"
          onClick={() => onFieldChange('trackInventory', !form.trackInventory)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
            form.trackInventory ? 'bg-brand-orange' : 'bg-slate-300 dark:bg-slate-600'
          }`}
          style={{ minWidth: '44px', minHeight: '24px' }}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            form.trackInventory ? 'translate-x-5' : 'translate-x-1'
          }`} />
        </button>
        <div>
          <p className="font-bold text-sm text-text-primary dark:text-slate-100">Track Inventory / Fuatilia Hisa</p>
          <p className="text-[10px] text-text-muted dark:text-slate-400">Monitor stock and get low-stock alerts</p>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted dark:text-slate-500 mb-3 px-0.5">
          Distributor / Msambazaji
        </p>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Distributor Name / Jina la Msambazaji">
            <input
              type="text" value={form.distributorName}
              onChange={(e) => onFieldChange('distributorName', e.target.value)}
              className={inputClass} placeholder="Supplier name" />
          </FormField>
          <FormField label="Distributor Phone / Simu ya Msambazaji">
            <input
              type="tel" value={form.distributorPhone}
              onChange={(e) => onFieldChange('distributorPhone', e.target.value)}
              className={inputClass} placeholder="Phone number" />
          </FormField>
        </div>
      </div>
    </div>
  )
}
