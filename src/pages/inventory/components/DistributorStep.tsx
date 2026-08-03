import { Zap } from 'lucide-react'
import { FormField } from '../../../components/shared/FormField'
import type { ProductFormState } from '../hooks/productFormMappers'

interface DistributorStepProps {
  form: ProductFormState
  barcodeInputRef: React.RefObject<HTMLInputElement | null>
  onFieldChange: <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => void
  onGenerateBarcode: () => void
}

const inputClass = "w-full bg-white dark:bg-slate-800 border border-border-color dark:border-slate-600 rounded-xl py-2.5 px-3.5 font-semibold text-text-primary dark:text-slate-100 focus:border-brand-orange focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/30 outline-none"

export const DistributorStep: React.FC<DistributorStepProps> = ({
  form, barcodeInputRef, onFieldChange, onGenerateBarcode,
}) => {
  // Prevent Enter on barcode from submitting the form (scanner sends Enter after scan)
  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.currentTarget.blur()
    }
  }

  return (
    <div className="pt-2 pb-2 space-y-4">
      <div className="text-center pb-2">
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
          Barcode & Distributor / Kodi na Msambazaji
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Scan or enter barcode, then supplier details (optional)
        </p>
      </div>

      {/* Barcode — last chance in wizard, scanner Enter does NOT submit */}
      <FormField label="Barcode / Kodi ya Bar" hint="Scan barcode or tap the zap button to auto-generate">
        <div className="flex gap-2">
          <input
            type="text"
            value={form.barcode}
            ref={barcodeInputRef}
            onChange={(e) => onFieldChange('barcode', e.target.value.toUpperCase())}
            onKeyDown={handleBarcodeKeyDown}
            className="flex-1 bg-white dark:bg-slate-800 border border-border-color
              dark:border-slate-600 rounded-xl py-2.5 px-3.5 font-semibold text-xs
              text-text-primary dark:text-slate-100 focus:border-brand-orange
              focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/30 outline-none
              min-w-0"
            placeholder="Scan or type..."
          />
          <button
            type="button"
            onClick={onGenerateBarcode}
            className="w-10 h-10 bg-orange-50 dark:bg-orange-900/30 text-brand-orange
              rounded-xl flex items-center justify-center hover:bg-orange-100
              dark:hover:bg-orange-900/50 flex-shrink-0 transition-colors"
            title="Auto-generate barcode"
          >
            <Zap size={16} />
          </button>
        </div>
      </FormField>

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
