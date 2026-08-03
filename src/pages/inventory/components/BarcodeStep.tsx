import { Zap } from 'lucide-react'
import { FormField } from '../../../components/shared/FormField'
import type { ProductFormState } from '../hooks/productFormMappers'

interface BarcodeStepProps {
  form: ProductFormState
  barcodeInputRef: React.RefObject<HTMLInputElement | null>
  onFieldChange: <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => void
  onGenerateBarcode: () => void
}

export const BarcodeStep: React.FC<BarcodeStepProps> = ({
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
          Barcode / Kodi ya Bar
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Scan barcode or auto-generate — press Enter to confirm without closing
        </p>
      </div>

      <FormField label="Barcode / Kodi ya Bar">
        <div className="flex gap-2">
          <input
            type="text"
            value={form.barcode}
            ref={barcodeInputRef}
            autoFocus
            onChange={(e) => onFieldChange('barcode', e.target.value.toUpperCase())}
            onKeyDown={handleBarcodeKeyDown}
            className="flex-1 bg-white dark:bg-slate-800 border border-border-color
              dark:border-slate-600 rounded-xl py-3 px-4 font-mono text-base
              text-text-primary dark:text-slate-100 placeholder-slate-400
              focus:border-brand-orange focus:ring-2 focus:ring-orange-100
              dark:focus:ring-orange-900/30 outline-none min-w-0"
            placeholder="Scan or type barcode..."
          />
          <button
            type="button"
            onClick={onGenerateBarcode}
            className="w-12 h-12 bg-orange-50 dark:bg-orange-900/30 text-brand-orange
              rounded-xl flex items-center justify-center hover:bg-orange-100
              dark:hover:bg-orange-900/50 flex-shrink-0 transition-colors shadow-sm"
            title="Auto-generate barcode"
          >
            <Zap size={20} />
          </button>
        </div>
      </FormField>

      <p className="text-center text-xs text-slate-400 dark:text-slate-500">
        Leave blank for items without barcodes
      </p>
    </div>
  )
}
