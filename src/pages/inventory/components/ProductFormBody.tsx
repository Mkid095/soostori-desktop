import { Plus } from 'lucide-react'
import { useProductForm } from '../hooks/useProductForm'
import { ProductFormPricing } from './ProductFormPricing'
import { ProductFormImage } from './ProductFormImage'
import { ProductFormSkuBarcode } from './ProductFormSkuBarcode'
import { ProductFormDistributor } from './ProductFormDistributor'
import { ProductFormStock } from './ProductFormStock'
import { CategoryAddPanel } from './CategoryAddPanel'
import { FormField } from '../../../components/shared/FormField'
import { UNITS } from '../constants'
import type { Category } from '../../../lib/types'

interface ProductFormBodyProps {
  form: ReturnType<typeof useProductForm>
  categories: Category[]
  onAddCategory: (name: string, color: string) => void
}

export const ProductFormBody: React.FC<ProductFormBodyProps> = ({
  form: {
    mode, form, updateField, groupPrices, imagePreview,
    fileInputRef, barcodeInputRef,
    showAddCategory, setShowAddCategory,
    newCategoryName, setNewCategoryName,
    newCategoryColor, setNewCategoryColor,
    addingCategory, costPerUnit,
    handleImageSelect, clearImage, generateBarcode,
    addGroupPrice, updateGroupPrice, removeGroupPrice, handleAddCategory,
    handleBulkPriceChange,
  }, categories, onAddCategory
}) => {
  return (
    <div className="space-y-4">
      <FormField label="Product Name" required>
        <input type="text" value={form.name}
          onChange={(e) => updateField('name', e.target.value)} required
          className="w-full bg-white dark:bg-slate-800 border border-border-color
            dark:border-slate-600 rounded-xl py-3 px-4 font-semibold
            text-text-primary dark:text-slate-100 focus:border-brand-orange
            focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/30 outline-none"
          placeholder="e.g. Coca Cola 500ml" />
      </FormField>

      <ProductFormImage imagePreview={imagePreview} fileInputRef={fileInputRef}
        onSelect={handleImageSelect} onClear={clearImage} />

      <ProductFormSkuBarcode sku={form.sku} barcode={form.barcode} barcodeInputRef={barcodeInputRef}
        onSkuChange={(v) => updateField('sku', v)} onBarcodeChange={(v) => updateField('barcode', v)}
        onGenerate={generateBarcode} />

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Category">
          <div className="flex gap-1">
            <select value={form.categoryId}
              onChange={(e) => updateField('categoryId', e.target.value)}
              className="flex-1 bg-white dark:bg-slate-800 border border-border-color
                dark:border-slate-600 rounded-xl py-2.5 px-3.5 font-semibold
                text-text-primary dark:text-slate-100 focus:border-brand-orange
                outline-none text-sm min-w-0">
              <option value="">No category</option>
              {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
            <button type="button" onClick={() => setShowAddCategory(!showAddCategory)}
              className="w-10 h-10 bg-slate-100 dark:bg-slate-700 text-slate-500
                dark:text-slate-300 rounded-xl flex items-center justify-center
                hover:bg-slate-200 dark:hover:bg-slate-600 flex-shrink-0">
              <Plus size={16} />
            </button>
          </div>
          {showAddCategory && (
            <CategoryAddPanel name={newCategoryName} color={newCategoryColor}
              addingCategory={addingCategory} onNameChange={setNewCategoryName}
              onColorChange={setNewCategoryColor}
              onAdd={() => handleAddCategory(onAddCategory)}
              onCancel={() => setShowAddCategory(false)} />
          )}
        </FormField>
        <FormField label="Unit">
          <select value={form.unit} onChange={(e) => updateField('unit', e.target.value)}
            className="w-full bg-white dark:bg-slate-800 border border-border-color
              dark:border-slate-600 rounded-xl py-2.5 px-3.5 font-semibold
              text-text-primary dark:text-slate-100 focus:border-brand-orange outline-none text-sm">
            {UNITS.map(u => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
          </select>
        </FormField>
      </div>

      <ProductFormDistributor distributorName={form.distributorName}
        distributorPhone={form.distributorPhone}
        onNameChange={(v) => updateField('distributorName', v)}
        onPhoneChange={(v) => updateField('distributorPhone', v)} />

      <ProductFormPricing mode={mode} form={form} costPerUnit={costPerUnit} groupPrices={groupPrices}
        onFieldChange={updateField as (field: string, value: string) => void}
        onBulkPriceChange={handleBulkPriceChange}
        onAllowSingleUnitSaleToggle={() => updateField('allowSingleUnitSale', !form.allowSingleUnitSale)}
        onAddGroupPrice={addGroupPrice} onUpdateGroupPrice={updateGroupPrice}
        onRemoveGroupPrice={removeGroupPrice} />

      <ProductFormStock stockQuantity={form.stockQuantity} lowStockThreshold={form.lowStockThreshold}
        trackInventory={form.trackInventory}
        onStockChange={(v) => updateField('stockQuantity', v)}
        onThresholdChange={(v) => updateField('lowStockThreshold', v)}
        onTrackToggle={() => updateField('trackInventory', !form.trackInventory)} />
    </div>
  )
}
