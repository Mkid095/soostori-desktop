import { Plus } from 'lucide-react'
import { FormField } from '../../../components/shared/FormField'
import { ProductFormImage } from './ProductFormImage'
import { UNITS } from '../constants'
import type { Category } from '../../../lib/types'
import type { ProductFormState } from '../hooks/productFormMappers'

interface DetailsStepProps {
  form: ProductFormState
  categories: Category[]
  imagePreview: string | null
  fileInputRef: React.RefObject<HTMLInputElement | null>
  showAddCategory: boolean
  newCategoryName: string
  newCategoryColor: string
  addingCategory: boolean
  onFieldChange: <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => void
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClearImage: () => void
  onShowAddCategory: (show: boolean) => void
  onNewCategoryName: (v: string) => void
  onNewCategoryColor: (v: string) => void
  onAddCategory: () => void
}

export const DetailsStep: React.FC<DetailsStepProps> = ({
  form, categories, imagePreview, fileInputRef,
  showAddCategory, newCategoryName, newCategoryColor, addingCategory,
  onFieldChange, onImageSelect, onClearImage,
  onShowAddCategory, onNewCategoryName, onNewCategoryColor, onAddCategory,
}) => {
  return (
    <div className="pt-2 pb-2 space-y-4">
      {/* Product Name — full width */}
      <FormField
        label="Product Name / Jina la Bidhaa"
        required
        hint="As it appears on receipts"
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

      {/* Image | SKU — side by side */}
      <div className="grid grid-cols-[auto_1fr] gap-3 items-start">
        <ProductFormImage
          imagePreview={imagePreview}
          fileInputRef={fileInputRef}
          onSelect={onImageSelect}
          onClear={onClearImage}
        />
        <FormField label="SKU">
          <input type="text" value={form.sku}
            onChange={(e) => onFieldChange('sku', e.target.value.toUpperCase())}
            className="w-full bg-white dark:bg-slate-800 border border-border-color
              dark:border-slate-600 rounded-xl py-2.5 px-3.5 font-semibold
              text-text-primary dark:text-slate-100 focus:border-brand-orange
              focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/30 outline-none"
            placeholder="SKU-001" />
        </FormField>
      </div>

      {/* Category | Unit — side by side */}
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Category / Kategoria">
          <div className="flex gap-1.5">
            <select
              value={form.categoryId}
              onChange={(e) => {
                if (e.target.value === '__add_new__') onShowAddCategory(true)
                else onFieldChange('categoryId', e.target.value)
              }}
              className="flex-1 bg-white dark:bg-slate-800 border border-border-color
                dark:border-slate-600 rounded-xl py-2.5 px-3 font-semibold
                text-text-primary dark:text-slate-100 focus:border-brand-orange
                outline-none text-sm min-w-0"
            >
              <option value="">—</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
              <option value="__add_new__">+ Add New</option>
            </select>
            <button
              type="button"
              onClick={() => onShowAddCategory(!showAddCategory)}
              className="w-10 h-10 bg-slate-100 dark:bg-slate-700 text-slate-500
                dark:text-slate-300 rounded-xl flex items-center justify-center
                hover:bg-slate-200 dark:hover:bg-slate-600 flex-shrink-0 transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
          {showAddCategory && (
            <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-border-color dark:border-slate-600 space-y-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => onNewCategoryName(e.target.value)}
                placeholder="Category name"
                className="w-full bg-white dark:bg-slate-800 border border-border-color
                  dark:border-slate-600 rounded-lg py-2 px-3 text-sm font-semibold
                  text-text-primary dark:text-slate-100 outline-none"
              />
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  {['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#a855f7'].map(c => (
                    <button key={c} type="button"
                      onClick={() => onNewCategoryColor(c)}
                      className={`w-5 h-5 rounded-full border-2 ${newCategoryColor === c ? 'border-slate-800 dark:border-white' : 'border-transparent'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
                <button type="button" onClick={onAddCategory} disabled={!newCategoryName.trim() || addingCategory}
                  className="flex-1 py-1.5 bg-brand-orange text-white rounded-lg text-xs font-bold
                    hover:bg-orange-600 disabled:opacity-50 transition-colors">
                  {addingCategory ? '...' : 'Add'}
                </button>
                <button type="button" onClick={() => onShowAddCategory(false)}
                  className="py-1.5 px-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </FormField>

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
    </div>
  )
}
