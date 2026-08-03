import React from 'react'
import { X, Plus, Edit, Save, RefreshCw, Box, Layers } from 'lucide-react'
import { useProductForm } from '../hooks/useProductForm'
import { ProductFormBody } from './ProductFormBody'
import type { Product, Category } from '../../../lib/types'

interface ProductFormModalProps {
  product?: Product | null
  categories: Category[]
  onSave: (data: Partial<Product>) => void
  onClose: () => void
  isSaving: boolean
  onAddCategory: (name: string, color: string) => void
  initialBarcode?: string
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  product, categories, onSave, onClose, isSaving, onAddCategory, initialBarcode
}) => {
  const form = useProductForm(product ?? null, initialBarcode)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(form.buildProductData())
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="shrink-0 px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center
              ${product?.id ? 'bg-blue-50 text-blue-500' : 'bg-brand-orange text-white'}`}>
              {product?.id ? <Edit size={18} /> : <Plus size={18} />}
            </div>
            <div>
              <h2 className="font-bold text-slate-800">
                {product?.id ? 'Edit Product' : 'Register New Product'}
              </h2>
              <p className="text-xs text-slate-400">
                {product?.id ? 'Update details' : 'Fill in the details'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="shrink-0 px-5 pt-4 flex gap-2">
          {([
            { value: 'loose', label: 'Loose Item', icon: Layers },
            { value: 'bulk', label: 'Bulk / Box', icon: Box },
          ] as const).map(({ value, label, icon: Icon }) => (
            <button key={value} type="button" onClick={() => form.setMode(value)}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center
                justify-center gap-2 transition-all ${
                  form.mode === value
                    ? 'bg-brand-orange text-white shadow-lg shadow-orange-200'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}>
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5">
          <ProductFormBody form={form} categories={categories} onAddCategory={onAddCategory} />

          {/* Footer */}
          <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose}
              className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-full font-bold
                hover:bg-slate-200 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSaving || !form.isValid()}
              className="flex-1 py-4 bg-brand-orange text-white rounded-full font-bold
                hover:bg-orange-600 disabled:opacity-50 transition-colors
                flex items-center justify-center gap-2 shadow-lg shadow-orange-200">
              {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
              {isSaving ? 'Saving...' : product?.id ? 'Update Product' : 'Register Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
