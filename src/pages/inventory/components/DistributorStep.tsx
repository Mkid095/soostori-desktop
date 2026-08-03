import { FormField } from '../../../components/shared/FormField'
import type { ProductFormState } from '../hooks/productFormMappers'

interface DistributorStepProps {
  form: ProductFormState
  onFieldChange: <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => void
}

const inputClass = "w-full bg-white dark:bg-slate-800 border border-border-color dark:border-slate-600 rounded-xl py-2.5 px-3.5 font-semibold text-text-primary dark:text-slate-100 focus:border-brand-orange focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/30 outline-none"

export const DistributorStep: React.FC<DistributorStepProps> = ({
  form, onFieldChange,
}) => {
  return (
    <div className="pt-2 pb-2 space-y-4">
      <div className="text-center pb-2">
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
          Distributor / Msambazaji
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Supplier details — optional, skip if not applicable
        </p>
      </div>

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
  )
}
