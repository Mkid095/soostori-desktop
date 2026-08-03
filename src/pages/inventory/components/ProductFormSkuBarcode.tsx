import { Zap } from 'lucide-react'
import { FormField } from '../../../components/shared/FormField'

interface ProductFormSkuBarcodeProps {
  sku: string
  barcode: string
  barcodeInputRef: React.RefObject<HTMLInputElement | null>
  onSkuChange: (v: string) => void
  onBarcodeChange: (v: string) => void
  onGenerate: () => void
}

const inputClass = "w-full bg-white dark:bg-slate-800 border border-border-color dark:border-slate-600 rounded-xl py-2.5 px-3.5 font-semibold text-text-primary dark:text-slate-100 focus:border-brand-orange focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/30 outline-none"

export const ProductFormSkuBarcode: React.FC<ProductFormSkuBarcodeProps> = ({
  sku, barcode, barcodeInputRef,
  onSkuChange, onBarcodeChange, onGenerate
}) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      <FormField label="SKU">
        <input type="text" value={sku}
          onChange={(e) => onSkuChange(e.target.value.toUpperCase())}
          className={inputClass} placeholder="SKU-001" />
      </FormField>
      <FormField label="Barcode">
        <div className="flex gap-1.5">
          <input type="text" value={barcode} ref={barcodeInputRef}
            onChange={(e) => onBarcodeChange(e.target.value.toUpperCase())}
            className={`${inputClass} flex-1 min-w-0 text-xs`}
            placeholder="Scan or type..." />
          <button type="button" onClick={onGenerate}
            className="w-9 h-9 bg-orange-50 dark:bg-orange-900/30 text-brand-orange
              rounded-xl flex items-center justify-center hover:bg-orange-100
              dark:hover:bg-orange-900/50 flex-shrink-0"
            title="Auto-gen">
            <Zap size={16} />
          </button>
        </div>
      </FormField>
    </div>
  )
}
