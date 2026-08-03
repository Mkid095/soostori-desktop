import { FormField } from '../../../components/shared/FormField'

interface ProductFormStockProps {
  stockQuantity: string
  lowStockThreshold: string
  trackInventory: boolean
  onStockChange: (v: string) => void
  onThresholdChange: (v: string) => void
  onTrackToggle: () => void
}

const inputClass = "w-full bg-white dark:bg-slate-800 border border-border-color dark:border-slate-600 rounded-xl py-2.5 px-3.5 font-semibold text-text-primary dark:text-slate-100 focus:border-brand-orange focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/30 outline-none"

export const ProductFormStock: React.FC<ProductFormStockProps> = ({
  stockQuantity, lowStockThreshold, trackInventory,
  onStockChange, onThresholdChange, onTrackToggle
}) => {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Opening Stock Qty">
          <input type="number" min="0" value={stockQuantity}
            onChange={(e) => onStockChange(e.target.value)}
            className={inputClass} placeholder="0" />
        </FormField>
        <FormField label="Low Stock Alert">
          <input type="number" min="0" value={lowStockThreshold}
            onChange={(e) => onThresholdChange(e.target.value)}
            className={inputClass} placeholder="10" />
        </FormField>
      </div>

      <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-border-color dark:border-slate-700">
        <button type="button" onClick={onTrackToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full
            transition-colors shrink-0 ${trackInventory ? 'bg-brand-orange' : 'bg-slate-300 dark:bg-slate-600'}`}
          style={{ minWidth: '44px', minHeight: '24px' }}>
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow
            transition-transform ${trackInventory ? 'translate-x-5' : 'translate-x-1'}`} />
        </button>
        <div>
          <p className="font-bold text-sm text-text-primary dark:text-slate-100">Track Inventory</p>
          <p className="text-[10px] text-text-muted dark:text-slate-400">Monitor stock levels and get low-stock alerts</p>
        </div>
      </div>
    </div>
  )
}
