import { Plus } from 'lucide-react'
import { FormField } from '../../../components/shared/FormField'
import { ProductFormImage } from './ProductFormImage'
import { ProductFormSkuBarcode } from './ProductFormSkuBarcode'
import { CategoryAddPanel } from './CategoryAddPanel'
import { UNITS } from '../constants'
import type { Category } from '../../../lib/types'
import type { ProductFormState } from '../hooks/productFormMappers'

interface DetailsStepProps {
  form: ProductFormState
  categories: Category[]
  imagePreview: string | null
  fileInputRef: React.RefObject<HTMLInputElement | null>
  barcodeInputRef: React.RefObject<HTMLInputElement | null>
  showAddCategory: boolean
  newCategoryName: string
  newCategoryColor: string
  addingCategory: boolean
  onFieldChange: <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => void
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClearImage: () => void
  onGenerateBarcode: () => void
  onShowAddCategory: (show: boolean) => void
  onNewCategoryName: (v: string) => void
  onNewCategoryColor: (v: string) => void
  onAddCategory: () => void
}

export const DetailsStep: React.FC<DetailsStepProps> = ({
  form, categories, imagePreview, fileInputRef, barcodeInputRef,
  showAddCategory, newCategoryName, newCategoryColor, addingCategory,
  onFieldChange, onImageSelect, onClearImage, onGenerateBarcode,
  onShowAddCategory, onNewCategoryName, onNewCategoryColor, onAddCategory,
}) => {
  return (
    <div className="space-y-4">
      <FormField
        label="Product Name / Jina la Bidhaa"
        required
        hint="Enter the product name as it should appear on receipts"
      >
        <input
          type="text"
          value={form.name}
          onChange={(e) => onFieldChange('name', e.target.value)}
          required
          className="w-full bg-white dark:bg-slate-800 border border-border-color
            dark:border-slate-600 rounded-xl py-3 px-4 font-semibold
            text-text-primary dark:text-slate-100 focus:border-brand-orange
            focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/30 outline-none"
          placeholder="e.g. Coca Cola 500ml"
        />
      </FormField>

      <ProductFormImage
        imagePreview={imagePreview}
        fileInputRef={fileInputRef}
        onSelect={onImageSelect}
        onClear={onClearImage}
      />

      <ProductFormSkuBarcode
        sku={form.sku}
        barcode={form.barcode}
        barcodeInputRef={barcodeInputRef}
        onSkuChange={(v) => onFieldChange('sku', v)}
        onBarcodeChange={(v) => onFieldChange('barcode', v)}
        onGenerate={onGenerateBarcode}
      />

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Category /Kategoria" hint="Optional grouping">
          <div className="flex gap-1">
            <select
              value={form.categoryId}
              onChange={(e) => onFieldChange('categoryId', e.target.value)}
              className="flex-1 bg-white dark:bg-slate-800 border border-border-color
                dark:border-slate-600 rounded-xl py-2.5 px-3.5 font-semibold
                text-text-primary dark:text-slate-100 focus:border-brand-orange
                outline-none text-sm min-w-0"
            >
              <option value="">No category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onShowAddCategory(!showAddCategory)}
              className="w-10 h-10 bg-slate-100 dark:bg-slate-700 text-slate-500
                dark:text-slate-300 rounded-xl flex items-center justify-center
                hover:bg-slate-200 dark:hover:bg-slate-600 flex-shrink-0"
            >
              <Plus size={16} />
            </button>
          </div>
          {showAddCategory && (
            <CategoryAddPanel
              name={newCategoryName}
              color={newCategoryColor}
              addingCategory={addingCategory}
              onNameChange={onNewCategoryName}
              onColorChange={onNewCategoryColor}
              onAdd={onAddCategory}
              onCancel={() => onShowAddCategory(false)}
            />
          )}
        </FormField>

        <FormField label="Unit / Uniti">
          <select
            value={form.unit}
            onChange={(e) => onFieldChange('unit', e.target.value)}
            className="w-full bg-white dark:bg-slate-800 border border-border-color
              dark:border-slate-600 rounded-xl py-2.5 px-3.5 font-semibold
              text-text-primary dark:text-slate-100 focus:border-brand-orange outline-none text-sm"
          >
            {UNITS.map(u => (
              <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>
            ))}
          </select>
        </FormField>
      </div>
    </div>
  )
}
