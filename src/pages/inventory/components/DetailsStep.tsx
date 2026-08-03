import { Zap } from 'lucide-react'
import { FormField } from '../../../components/shared/FormField'
import { ProductFormImage } from './ProductFormImage'
import { CategoryInlineAdd } from './CategoryInlineAdd'
import { UNITS } from '../constants'
import { useEffect } from 'react'
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
  // Barcode auto-focus with 300ms delay — scanner input time
  useEffect(() => {
    if (barcodeInputRef.current && form.barcode === '' && !showAddCategory) {
      const timer = setTimeout(() => barcodeInputRef.current?.focus(), 300)
      return () => clearTimeout(timer)
    }
  }, [barcodeInputRef, form.barcode, showAddCategory])

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    if (val === '__add_new__') {
      onShowAddCategory(true)
    } else {
      onFieldChange('categoryId', val)
    }
  }

  // Prevent Enter on barcode from submitting the form
  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.currentTarget.blur()
    }
  }

  return (
    <div className="pt-2 pb-2 space-y-4">
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

      <div className="grid grid-cols-2 gap-3">
        <FormField label="SKU">
          <input type="text" value={form.sku}
            onChange={(e) => onFieldChange('sku', e.target.value.toUpperCase())}
            className="w-full bg-white dark:bg-slate-800 border border-border-color
              dark:border-slate-600 rounded-xl py-2.5 px-3.5 font-semibold
              text-text-primary dark:text-slate-100 focus:border-brand-orange
              focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/30 outline-none"
            placeholder="SKU-001" />
        </FormField>
        <FormField label="Category / Kategoria" hint="Optional grouping">
          <div className="space-y-2">
            <select
              value={form.categoryId}
              onChange={handleCategoryChange}
              className="w-full bg-white dark:bg-slate-800 border border-border-color
                dark:border-slate-600 rounded-xl py-2.5 px-3 font-semibold
                text-text-primary dark:text-slate-100 focus:border-brand-orange
                outline-none text-sm"
            >
              <option value="">No category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
              <option value="__add_new__">+ Add New Category</option>
            </select>
            {showAddCategory && (
              <CategoryInlineAdd
                name={newCategoryName}
                color={newCategoryColor}
                addingCategory={addingCategory}
                onNameChange={onNewCategoryName}
                onColorChange={onNewCategoryColor}
                onAdd={onAddCategory}
                onCancel={() => onShowAddCategory(false)}
              />
            )}
          </div>
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Unit / Uniti">
          <select
            value={form.unit}
            onChange={(e) => onFieldChange('unit', e.target.value)}
            className="w-full bg-white dark:bg-slate-800 border border-border-color
              dark:border-slate-600 rounded-xl py-2.5 px-3 font-semibold
              text-text-primary dark:text-slate-100 focus:border-brand-orange outline-none text-sm"
          >
            {UNITS.map(u => (
              <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>
            ))}
          </select>
        </FormField>
      </div>

      {/* Barcode — last field, auto-focus for scanner, Enter does NOT submit */}
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
    </div>
  )
}
