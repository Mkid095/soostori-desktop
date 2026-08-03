import type { ProductFormState } from '../hooks/productFormMappers'

interface AllowSingleUnitToggleProps {
  form: ProductFormState
  onToggle: () => void
}

export const AllowSingleUnitToggle: React.FC<AllowSingleUnitToggleProps> = ({ form, onToggle }) => (
  <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-border-color dark:border-slate-700">
    <button
      type="button"
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
        form.allowSingleUnitSale ? 'bg-brand-orange' : 'bg-slate-300 dark:bg-slate-600'
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
        form.allowSingleUnitSale ? 'translate-x-5' : 'translate-x-1'
      }`} />
    </button>
    <div className="flex-1">
      <p className="font-bold text-sm text-text-primary dark:text-slate-100">
        Allow single unit sale / Ruhusu uuzaji wa uniti moja
      </p>
      <p className="text-[10px] text-text-muted dark:text-slate-400">
        {form.allowSingleUnitSale
          ? 'This item can be sold one at a time'
          : 'This item is sold in bulk only — use bulk discounts'}
      </p>
    </div>
  </div>
)
