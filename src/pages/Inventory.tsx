import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  Search, Plus, Edit, Trash2, X, Save, RefreshCw, Check, Box,
  Package, Camera, Zap, Layers, Minus, Image,
  ChevronDown, ChevronUp, Loader2,
} from 'lucide-react'
import {
  useProducts, useCategories, useCreateProduct, useUpdateProduct,
  useDeleteProduct, useAdjustStock, useCreateCategory,
} from '../hooks/useDatabase'
import { useScanner } from '../hooks/useScanner'
import { useQueryClient } from '@tanstack/react-query'
import { formatCurrency } from '../lib/utils'
import type { Product, Category } from '../lib/types'

const UNITS = [
  'piece', 'pack', 'box', 'carton', 'dozen', 'pair', 'set', 'roll',
  'bundle', 'crate', 'tray', 'sachet', 'tube', 'bottle', 'can', 'bag', 'packet', 'loaf',
]

const CATEGORY_COLORS = [
  '#F97316', '#22C55E', '#3B82F6', '#A855F7', '#EC4899',
  '#06B6D4', '#F59E0B', '#EF4444', '#6366F1', '#14B8A6',
]

// ========== PRODUCT FORM MODAL ==========

const ProductFormModal: React.FC<{
  product?: Product | null
  categories: Category[]
  onSave: (data: Partial<Product>) => void
  onClose: () => void
  isSaving: boolean
  onAddCategory: (name: string, color: string) => void
  onBarcodeScanned?: (barcode: string) => void
  initialBarcode?: string
}> = ({ product, categories, onSave, onClose, isSaving, onAddCategory, initialBarcode }) => {
  const [mode, setMode] = useState<'loose' | 'bulk'>(
    product?.unitsPerPackage ? 'bulk' : 'loose'
  )
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState(CATEGORY_COLORS[0])
  const [addingCategory, setAddingCategory] = useState(false)
  const [groupPrices, setGroupPrices] = useState<{ quantity: number; price: number }[]>(
    product?.groupPrices || []
  )
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || '')
  const [imagePreview, setImagePreview] = useState<string | null>(product?.imageUrl || null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const barcodeInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    name: product?.name || '',
    sku: product?.sku || '',
    barcode: product?.barcode || '',
    categoryId: product?.categoryId || '',
    unit: product?.unit || 'piece',
    distributorName: product?.distributorName || '',
    distributorPhone: product?.distributorPhone || '',
    costPrice: product?.costPrice !== undefined ? String(product.costPrice) : '0',
    sellingPrice: product?.sellingPrice !== undefined ? String(product.sellingPrice) : '0',
    stockQuantity: product?.stockQuantity !== undefined ? String(product.stockQuantity) : '0',
    lowStockThreshold: product?.lowStockThreshold !== undefined ? String(product.lowStockThreshold) : '10',
    trackInventory: product?.trackInventory ?? true,
    allowSingleUnitSale: product?.allowSingleUnitSale ?? true,
    unitsPerPackage: product?.unitsPerPackage !== undefined ? String(product.unitsPerPackage) : '',
    boxBuyingPrice: product?.boxBuyingPrice !== undefined ? String(product.boxBuyingPrice) : '',
    bulkSellingPrice: product?.bulkSellingPrice !== undefined ? String(product.bulkSellingPrice) : '',
  })

  // When initialBarcode is set (from scanner), fill the barcode field
  useEffect(() => {
    if (initialBarcode && !product?.id) {
      setForm(f => ({ ...f, barcode: initialBarcode }))
      barcodeInputRef.current?.focus()
    }
  }, [initialBarcode, product?.id])

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      setImagePreview(dataUrl)
      setImageUrl(dataUrl)
    }
    reader.readAsDataURL(file)
  }, [])

  const generateBarcode = () => {
    const bc = `SOO${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`
    setForm(f => ({ ...f, barcode: bc }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const unitCost = mode === 'bulk' && form.boxBuyingPrice && form.unitsPerPackage
      ? parseFloat(form.boxBuyingPrice) / parseInt(form.unitsPerPackage)
      : parseFloat(form.costPrice) || 0
    const selling = mode === 'bulk' && form.bulkSellingPrice
      ? parseFloat(form.bulkSellingPrice)
      : parseFloat(form.sellingPrice) || 0

    onSave({
      name: form.name, sku: form.sku || undefined, barcode: form.barcode || undefined,
      categoryId: form.categoryId || undefined, unit: form.unit,
      distributorName: form.distributorName || undefined, distributorPhone: form.distributorPhone || undefined,
      costPrice: unitCost, sellingPrice: selling,
      stockQuantity: parseInt(form.stockQuantity) || 0,
      lowStockThreshold: parseInt(form.lowStockThreshold) || 10,
      trackInventory: form.trackInventory,
      allowSingleUnitSale: mode === 'loose' ? form.allowSingleUnitSale : false,
      unitsPerPackage: mode === 'bulk' && form.unitsPerPackage ? parseInt(form.unitsPerPackage) : undefined,
      boxBuyingPrice: mode === 'bulk' && form.boxBuyingPrice ? parseFloat(form.boxBuyingPrice) : undefined,
      bulkSellingPrice: mode === 'bulk' && form.bulkSellingPrice ? parseFloat(form.bulkSellingPrice) : undefined,
      groupPrices: groupPrices.length > 0 ? groupPrices : undefined,
      imageUrl: imageUrl || undefined,
      barcodeGenerated: !form.barcode,
    } as Partial<Product>)
  }

  const addGroupPrice = () => setGroupPrices(gp => [...gp, { quantity: 1, price: 0 }])
  const updateGroupPrice = (i: number, field: 'quantity' | 'price', val: string) => {
    setGroupPrices(gp => gp.map((item, idx) =>
      idx === i ? { ...item, [field]: field === 'quantity' ? parseInt(val) || 1 : parseFloat(val) || 0 } : item
    ))
  }
  const removeGroupPrice = (i: number) => setGroupPrices(gp => gp.filter((_, idx) => idx !== i))

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return
    setAddingCategory(true)
    await onAddCategory(newCategoryName.trim(), newCategoryColor)
    setNewCategoryName('')
    setShowAddCategory(false)
    setAddingCategory(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="shrink-0 px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${product?.id ? 'bg-blue-50 text-blue-500' : 'bg-brand-orange text-white'}`}>
              {product?.id ? <Edit size={18} /> : <Plus size={18} />}
            </div>
            <div>
              <h2 className="font-bold text-slate-800">{product?.id ? 'Edit Product' : 'Register New Product'}</h2>
              <p className="text-xs text-slate-400">{product?.id ? 'Update details' : 'Fill in the details'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="shrink-0 px-5 pt-4 flex gap-2">
          {[
            { value: 'loose', label: 'Loose Item', icon: Layers },
            { value: 'bulk', label: 'Bulk / Box', icon: Box },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value as any)}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                mode === value
                  ? 'bg-brand-orange text-white shadow-lg shadow-orange-200'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5">
          <div className="space-y-4">

            {/* Name */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Product Name *</label>
              <input type="text" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} required
                className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 font-semibold text-slate-700 focus:border-brand-orange focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                placeholder="e.g. Coca Cola 500ml"
              />
            </div>

            {/* Image */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Product Image</label>
              <div className="flex items-center gap-3">
                {imagePreview ? (
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => { setImagePreview(null); setImageUrl('') }}
                      className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white rounded-bl-lg flex items-center justify-center">
                      <X size={10} />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-brand-orange hover:text-brand-orange transition-colors shrink-0">
                    <Image size={20} />
                    <span className="text-[9px] mt-0.5">Add</span>
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                <div className="flex-1">
                  <p className="text-xs text-slate-400">Tap the icon to upload a product image</p>
                  <p className="text-[10px] text-slate-300 mt-0.5">JPG, PNG, WebP up to 2MB</p>
                </div>
              </div>
            </div>

            {/* SKU + Barcode */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">SKU</label>
                <input type="text" value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 font-semibold text-slate-700 focus:border-brand-orange outline-none"
                  placeholder="SKU-001"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Barcode</label>
                <div className="flex gap-1.5">
                  <input type="text" value={form.barcode} ref={barcodeInputRef}
                    onChange={(e) => setForm({ ...form, barcode: e.target.value.toUpperCase() })}
                    className="flex-1 min-w-0 bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 font-semibold text-slate-700 focus:border-brand-orange outline-none text-xs"
                    placeholder="Scan or type..."
                  />
                  <button type="button" onClick={generateBarcode}
                    className="w-9 h-9 bg-orange-50 text-brand-orange rounded-xl flex items-center justify-center hover:bg-orange-100 flex-shrink-0" title="Auto-gen">
                    <Zap size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Category + Unit */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Category</label>
                <div className="flex gap-1">
                  <select value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    className="flex-1 bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 font-semibold text-slate-700 focus:border-brand-orange outline-none text-sm min-w-0">
                    <option value="">No category</option>
                    {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                  <button type="button" onClick={() => setShowAddCategory(!showAddCategory)}
                    className="w-10 h-10 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center hover:bg-slate-200 flex-shrink-0">
                    <Plus size={16} />
                  </button>
                </div>
                {showAddCategory && (
                  <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <input type="text" value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Category name"
                      className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm font-semibold mb-2 outline-none focus:border-brand-orange"
                    />
                    <div className="flex gap-1.5 mb-2 flex-wrap">
                      {CATEGORY_COLORS.map(c => (
                        <button key={c} type="button" onClick={() => setNewCategoryColor(c)}
                          className={`w-6 h-6 rounded-full border-2 ${newCategoryColor === c ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <button type="button" onClick={handleAddCategory}
                      disabled={!newCategoryName.trim() || addingCategory}
                      className="w-full py-2 bg-brand-orange text-white rounded-lg font-bold text-xs disabled:opacity-50 flex items-center justify-center gap-1">
                      {addingCategory ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                      Add Category
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Unit</label>
                <select value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 font-semibold text-slate-700 focus:border-brand-orange outline-none text-sm">
                  {UNITS.map(u => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
                </select>
              </div>
            </div>

            {/* Distributor */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Distributor / Supplier</label>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" value={form.distributorName}
                  onChange={(e) => setForm({ ...form, distributorName: e.target.value })}
                  className="bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 font-semibold text-slate-700 focus:border-brand-orange outline-none text-sm"
                  placeholder="Supplier name"
                />
                <input type="tel" value={form.distributorPhone}
                  onChange={(e) => setForm({ ...form, distributorPhone: e.target.value })}
                  className="bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 font-semibold text-slate-700 focus:border-brand-orange outline-none text-sm"
                  placeholder="Phone number"
                />
              </div>
            </div>

            {/* Prices */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Pricing</p>

              {mode === 'bulk' ? (
                /* BULK MODE: units per box + box buy price + bulk sell price */
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Units per Box/Package</label>
                      <input type="number" value={form.unitsPerPackage}
                        onChange={(e) => {
                          const units = e.target.value
                          setForm(f => ({ ...f, unitsPerPackage: units }))
                          // Auto-calculate cost per unit
                          if (f.boxBuyingPrice && units) {
                            const costPerUnit = parseFloat(f.boxBuyingPrice) / parseInt(units)
                            setForm(prev => ({ ...prev, costPrice: costPerUnit.toFixed(2) }))
                          }
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 font-semibold text-slate-700 focus:border-brand-orange outline-none"
                        placeholder="e.g. 24"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Box Buying Price (KES)</label>
                      <input type="number" step="0.01" value={form.boxBuyingPrice}
                        onChange={(e) => {
                          const boxPrice = e.target.value
                          setForm(f => ({ ...f, boxBuyingPrice: boxPrice }))
                          // Auto-calculate cost per unit
                          if (boxPrice && f.unitsPerPackage) {
                            const costPerUnit = parseFloat(boxPrice) / parseInt(f.unitsPerPackage)
                            setForm(prev => ({ ...prev, costPrice: costPerUnit.toFixed(2) }))
                          }
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 font-semibold text-slate-700 focus:border-brand-orange outline-none"
                        placeholder="Cost of full box"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Cost per Unit (auto)</label>
                      <div className="w-full bg-slate-100 border border-slate-200 rounded-xl py-2.5 px-3.5 font-semibold text-slate-500 text-center">
                        {form.boxBuyingPrice && form.unitsPerPackage
                          ? `KES ${(parseFloat(form.boxBuyingPrice) / parseInt(form.unitsPerPackage)).toFixed(2)}`
                          : '— calculated —'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Selling Price per Box (KES)</label>
                      <input type="number" step="0.01" value={form.bulkSellingPrice}
                        onChange={(e) => setForm({ ...form, bulkSellingPrice: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 font-semibold text-slate-700 focus:border-brand-orange outline-none"
                        placeholder="Price per full box"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 italic">Cost per unit is calculated automatically from box price ÷ units. Add bulk discounts below for quantity pricing.</p>
                </div>
              ) : (
                /* LOOSE MODE: buy price + sell price + single unit toggle */
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Buying Price</label>
                      <input type="number" step="0.01" value={form.costPrice}
                        onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 font-semibold text-slate-700 focus:border-brand-orange outline-none"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        Selling Price {form.allowSingleUnitSale ? '*' : '(bulk only)'}
                      </label>
                      <input type="number" step="0.01"
                        value={form.sellingPrice}
                        onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                        disabled={!form.allowSingleUnitSale}
                        required={form.allowSingleUnitSale}
                        className={`w-full border rounded-xl py-2.5 px-3.5 font-semibold focus:border-brand-orange focus:ring-2 focus:ring-orange-100 outline-none transition-all ${
                          form.allowSingleUnitSale
                            ? 'bg-white border-slate-200 text-slate-700'
                            : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                        placeholder={form.allowSingleUnitSale ? '0.00' : 'N/A — use bulk discounts'}
                      />
                    </div>
                  </div>
                  {/* Allow single unit sale toggle */}
                  <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200">
                    <button type="button" onClick={() => setForm(f => ({ ...f, allowSingleUnitSale: !f.allowSingleUnitSale }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${form.allowSingleUnitSale ? 'bg-brand-orange' : 'bg-slate-300'}`}
                      style={{ minWidth: '44px', minHeight: '24px' }}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.allowSingleUnitSale ? 'translate-x-5' : 'translate-x-1'}`} />
                    </button>
                    <div className="flex-1">
                      <p className="font-bold text-sm text-slate-700">Allow single unit sale</p>
                      <p className="text-[10px] text-slate-400">
                        {form.allowSingleUnitSale
                          ? 'This item can be sold one at a time at the selling price above'
                          : 'This item is sold in bulk only — use bulk discounts for quantity pricing'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Group Prices */}
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Bulk Discounts</p>
                  <p className="text-[10px] text-amber-500 mt-0.5">e.g. "Buy 3 for Kes 100"</p>
                </div>
                <button type="button" onClick={addGroupPrice}
                  className="px-3 py-1.5 bg-amber-200 text-amber-800 rounded-lg font-bold text-xs hover:bg-amber-300 flex items-center gap-1">
                  <Plus size={12} /> Add
                </button>
              </div>
              {groupPrices.map((gp, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <input type="number" min="1" value={gp.quantity}
                    onChange={(e) => updateGroupPrice(i, 'quantity', e.target.value)}
                    className="w-20 bg-white border border-amber-200 rounded-lg py-2 px-2 text-sm font-semibold text-slate-700 outline-none"
                    placeholder="Qty"
                  />
                  <span className="text-xs text-slate-500 font-semibold">for</span>
                  <input type="number" step="0.01" value={gp.price}
                    onChange={(e) => updateGroupPrice(i, 'price', e.target.value)}
                    className="flex-1 bg-white border border-amber-200 rounded-lg py-2 px-2 text-sm font-semibold text-slate-700 outline-none"
                    placeholder="Price"
                  />
                  <button type="button" onClick={() => removeGroupPrice(i)}
                    className="w-7 h-7 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-lg">
                    <Minus size={14} />
                  </button>
                </div>
              ))}
              {groupPrices.length === 0 && (
                <p className="text-xs text-amber-600 font-semibold italic">No bulk discounts added yet</p>
              )}
            </div>

            {/* Stock */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Opening Stock Qty</label>
                <input type="number" min="0" value={form.stockQuantity}
                  onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 font-semibold text-slate-700 focus:border-brand-orange outline-none"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Low Stock Alert</label>
                <input type="number" min="0" value={form.lowStockThreshold}
                  onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 font-semibold text-slate-700 focus:border-brand-orange outline-none"
                  placeholder="10"
                />
              </div>
            </div>

            {/* Track toggle */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <button type="button" onClick={() => setForm(f => ({ ...f, trackInventory: !f.trackInventory }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${form.trackInventory ? 'bg-brand-orange' : 'bg-slate-300'}`}
                style={{ minWidth: '44px', minHeight: '24px' }}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.trackInventory ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
              <div>
                <p className="font-bold text-sm text-slate-700">Track Inventory</p>
                <p className="text-[10px] text-slate-400">Monitor stock levels and get low-stock alerts</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose}
              className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-full font-bold hover:bg-slate-200 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSaving || !form.name || (mode === 'loose' && form.allowSingleUnitSale && !form.sellingPrice)}
              className="flex-1 py-4 bg-brand-orange text-white rounded-full font-bold hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-orange-200">
              {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
              {isSaving ? 'Saving...' : product?.id ? 'Update Product' : 'Register Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ========== INLINE RESTOCK FORM ==========

const RestockInline: React.FC<{
  product: Product
  onSave: (qtyChange: number, reason: string, newBuyPrice?: number, newSellPrice?: number) => void
  onCancel: () => void
  isSaving: boolean
}> = ({ product, onSave, onCancel, isSaving }) => {
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('Restock')
  const [newBuyPrice, setNewBuyPrice] = useState(String(product.costPrice || 0))
  const [newSellPrice, setNewSellPrice] = useState(String(product.sellingPrice || 0))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const qty = parseInt(quantity)
    if (isNaN(qty) || qty <= 0) return
    onSave(qty, reason, parseFloat(newBuyPrice), parseFloat(newSellPrice))
  }

  const newStock = product.stockQuantity + (parseInt(quantity) || 0)

  return (
    <div className="bg-blue-50 border-b border-blue-100 px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-xs text-blue-700">Restock: {product.name}</span>
        <button onClick={onCancel} className="p-1 hover:bg-blue-100 rounded-lg text-blue-400">
          <X size={12} />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="flex items-end gap-2 flex-wrap">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase mb-0.5 block">Qty to Add *</label>
          <input type="number" min="1" value={quantity}
            onChange={(e) => setQuantity(e.target.value)} required
            className="w-24 bg-white border border-blue-200 rounded-lg py-1.5 px-2.5 text-sm font-bold text-slate-700 focus:border-blue-500 outline-none"
            autoFocus
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase mb-0.5 block">Reason</label>
          <select value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="bg-white border border-blue-200 rounded-lg py-1.5 px-2 text-xs font-semibold text-slate-700 focus:border-blue-500 outline-none">
            {['Restock', 'Purchase', 'Return', 'Transfer', 'Correction'].map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase mb-0.5 block">Buy Price</label>
          <input type="number" step="0.01" value={newBuyPrice}
            onChange={(e) => setNewBuyPrice(e.target.value)}
            className="w-20 bg-white border border-blue-200 rounded-lg py-1.5 px-2 text-xs font-semibold text-slate-700 focus:border-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase mb-0.5 block">Sell Price</label>
          <input type="number" step="0.01" value={newSellPrice}
            onChange={(e) => setNewSellPrice(e.target.value)}
            className="w-20 bg-white border border-blue-200 rounded-lg py-1.5 px-2 text-xs font-semibold text-slate-700 focus:border-blue-500 outline-none"
          />
        </div>
        {quantity && (
          <div className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2.5 py-1.5 rounded-lg whitespace-nowrap">
            → {newStock} {product.unit}
          </div>
        )}
        <button type="submit" disabled={isSaving || !quantity}
          className="py-1.5 px-4 bg-blue-500 text-white rounded-lg font-bold text-xs disabled:opacity-50 flex items-center gap-1">
          {isSaving ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
          Save
        </button>
      </form>
    </div>
  )
}

// ========== COMPACT PRODUCT ROW ==========

const ProductRow: React.FC<{
  product: Product
  onEdit: () => void
  onRestock: () => void
  onDelete: () => void
  isDeleting: boolean
}> = ({ product, onEdit, onRestock, onDelete, isDeleting }) => {
  const [showDelete, setShowDelete] = useState(false)
  const isLowStock = product.trackInventory && product.stockQuantity > 0 && product.stockQuantity <= product.lowStockThreshold
  const isOutOfStock = product.trackInventory && product.stockQuantity <= 0
  const colorIndex = product.categoryName ? product.categoryName.charCodeAt(0) % CATEGORY_COLORS.length : 0
  const color = product.categoryColor || CATEGORY_COLORS[colorIndex]

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-slate-100 hover:bg-slate-50 group transition-colors">
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {product.categoryName && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white whitespace-nowrap"
                style={{ backgroundColor: color + 'CC' }}>
                {product.categoryName}
              </span>
            )}
            <span className="font-bold text-sm text-slate-800 truncate">{product.name}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {product.barcode && (
              <span className="text-[10px] text-slate-400 font-mono">{product.barcode}</span>
            )}
            {product.trackInventory && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                isOutOfStock ? 'bg-red-50 text-red-600' :
                isLowStock ? 'bg-amber-50 text-amber-600' :
                'bg-emerald-50 text-emerald-600'
              }`}>
                {product.stockQuantity} {product.unit}
              </span>
            )}
          </div>
        </div>

        {/* Price */}
        <div className="text-right shrink-0">
          <span className="font-black text-sm text-brand-orange">{formatCurrency(product.sellingPrice)}</span>
          {product.costPrice > 0 && (
            <span className="text-[10px] text-slate-400 block">{formatCurrency(product.costPrice)} cost</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={onRestock}
            className="w-7 h-7 flex items-center justify-center text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
            title="Restock">
            <Plus size={13} />
          </button>
          <button onClick={onEdit}
            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:bg-orange-50 hover:text-brand-orange rounded-lg transition-colors"
            title="Edit">
            <Edit size={13} />
          </button>
          {showDelete ? (
            <div className="flex items-center gap-1">
              <button onClick={() => setShowDelete(false)}
                className="px-2 h-7 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-bold">
                Cancel
              </button>
              <button onClick={onDelete} disabled={isDeleting}
                className="px-2 h-7 bg-red-500 text-white rounded-lg text-[10px] font-bold disabled:opacity-50">
                {isDeleting ? '...' : 'Delete'}
              </button>
            </div>
          ) : (
            <button onClick={() => setShowDelete(true)}
              className="w-7 h-7 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete">
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </>
  )
}

// ========== MAIN INVENTORY PAGE ==========

const Inventory: React.FC = () => {
  const queryClient = useQueryClient()
  const { data: products = [], isLoading } = useProducts()
  const { data: categories = [] } = useCategories()
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const deleteProduct = useDeleteProduct()
  const adjustStock = useAdjustStock()
  const createCategory = useCreateCategory()

  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [restockingProduct, setRestockingProduct] = useState<Product | null>(null)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null)
  const [duplicateProduct, setDuplicateProduct] = useState<Product | null>(null)

  const stats = useMemo(() => ({
    total: products.filter(p => p.isActive).length,
    low: products.filter(p => p.trackInventory && p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold).length,
    out: products.filter(p => p.trackInventory && p.stockQuantity <= 0).length,
  }), [products])

  const filteredProducts = useMemo(() => products.filter((p) => {
    const matchesSearch = !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = categoryFilter === 'ALL' || p.categoryId === categoryFilter
    return matchesSearch && matchesCategory && p.isActive
  }), [products, searchTerm, categoryFilter])

  const handleSaveProduct = useCallback(async (data: Partial<Product>) => {
    if (editingProduct?.id) {
      await updateProduct.mutateAsync({ id: editingProduct.id, data })
    } else {
      await createProduct.mutateAsync(data)
    }
    // Force a direct refetch to ensure new product appears immediately
    await queryClient.refetchQueries({ queryKey: ['products'] })
    setEditingProduct(null)
    setShowAddProduct(false)
    setScannedBarcode(null)
  }, [editingProduct, createProduct, updateProduct, queryClient])

  const handleRestock = useCallback(async (qtyChange: number, reason: string, newBuyPrice?: number, newSellPrice?: number) => {
    if (!restockingProduct) return
    if (newBuyPrice !== undefined || newSellPrice !== undefined) {
      const updateData: Partial<Product> = {}
      if (newBuyPrice !== undefined) updateData.costPrice = newBuyPrice
      if (newSellPrice !== undefined) updateData.sellingPrice = newSellPrice
      await updateProduct.mutateAsync({ id: restockingProduct.id, data: updateData })
    }
    await adjustStock.mutateAsync({ productId: restockingProduct.id, quantityChange: qtyChange, reason })
    setRestockingProduct(null)
  }, [restockingProduct, adjustStock, updateProduct])

  const handleDelete = useCallback(async (id: string) => {
    await deleteProduct.mutateAsync(id)
  }, [deleteProduct])

  const handleAddCategory = useCallback(async (name: string, color: string) => {
    await createCategory.mutateAsync({ name, color })
  }, [createCategory])

  const isFormOpen = showAddProduct || editingProduct !== null
  const isSavingForm = createProduct.isPending || updateProduct.isPending
  const isSavingRestock = adjustStock.isPending || updateProduct.isPending

  // Barcode scanner: only active when form is open for new product
  const handleBarcodeScanned = useCallback((barcode: string) => {
    if (!showAddProduct) return // only fire in add-product mode, not edit mode
    // Check if barcode already exists
    const existing = products.find(p => p.barcode === barcode)
    if (existing) {
      setDuplicateProduct(existing)
      setScannedBarcode(null)
      return
    }
    // New barcode — fill it in the form
    setScannedBarcode(barcode)
  }, [showAddProduct, products])

  useScanner(handleBarcodeScanned)

  return (
    <div className="h-full bg-soft-yellow flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white px-4 py-2.5 flex items-center justify-between border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand-orange rounded-lg flex items-center justify-center text-white">
            <Package size={14} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800">Stock</h1>
            <p className="text-[10px] text-slate-400">{stats.total} products</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {stats.out > 0 && (
            <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-[10px] font-bold">
              {stats.out} out
            </span>
          )}
          {stats.low > 0 && (
            <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full text-[10px] font-bold">
              {stats.low} low
            </span>
          )}
        </div>
      </div>

      {/* Search + filter bar */}
      <div className="px-4 py-2 bg-white border-b border-slate-100 flex items-center gap-2 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input type="text" placeholder="Search name, barcode, SKU..."
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-8 pr-3 text-xs font-semibold focus:border-brand-orange outline-none"
          />
        </div>
        <select value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:border-brand-orange outline-none text-slate-600">
          <option value="ALL">All</option>
          {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
        </select>
        <button onClick={() => { setEditingProduct(null); setShowAddProduct(true) }}
          className="px-3 py-2 bg-brand-orange text-white rounded-lg font-bold text-xs hover:bg-orange-600 transition-colors flex items-center gap-1 shrink-0">
          <Plus size={12} /> Add
        </button>
      </div>

      {/* Category chips */}
      <div className="px-4 py-1.5 bg-white border-b border-slate-100 flex gap-1.5 overflow-x-auto shrink-0">
        <button onClick={() => setCategoryFilter('ALL')}
          className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors ${
            categoryFilter === 'ALL' ? 'bg-brand-orange text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}>
          All
        </button>
        {categories.map((cat) => (
          <button key={cat.id} onClick={() => setCategoryFilter(cat.id)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors ${
              categoryFilter === cat.id ? 'text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
            style={categoryFilter === cat.id ? { backgroundColor: cat.color || '#F97316' } : {}}>
            {cat.name}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        {/* Inline restock */}
        {restockingProduct && (
          <RestockInline
            product={restockingProduct}
            onSave={handleRestock}
            onCancel={() => setRestockingProduct(null)}
            isSaving={isSavingRestock}
          />
        )}

        {/* Product rows */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 animate-spin text-brand-orange" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Package size={36} className="mb-2 opacity-40" />
            <p className="font-bold text-sm">No products found</p>
            <p className="text-xs mt-0.5">Add products or adjust search</p>
          </div>
        ) : (
          <div>
            {filteredProducts.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                onEdit={() => {
                  setEditingProduct(product)
                  setRestockingProduct(null)
                  setShowAddProduct(false)
                }}
                onRestock={() => {
                  setRestockingProduct(product)
                  setEditingProduct(null)
                  setShowAddProduct(false)
                }}
                onDelete={() => handleDelete(product.id)}
                isDeleting={deleteProduct.isPending}
              />
            ))}
          </div>
        )}
      </div>

      {/* Product form modal (overlay, doesn't affect list layout) */}
      {isFormOpen && (
        <ProductFormModal
          product={editingProduct}
          categories={categories}
          onSave={handleSaveProduct}
          onClose={() => { setEditingProduct(null); setShowAddProduct(false); setScannedBarcode(null) }}
          isSaving={isSavingForm}
          onAddCategory={handleAddCategory}
          initialBarcode={scannedBarcode || undefined}
        />
      )}

      {/* Duplicate barcode alert */}
      {duplicateProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X size={32} className="text-red-500" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Barcode Already Exists!</h3>
            <p className="text-sm text-slate-500 mb-1">This barcode is already registered.</p>
            <div className="bg-slate-50 rounded-xl p-4 mt-3 mb-5 text-left">
              <p className="text-sm font-black text-slate-800">{duplicateProduct.name}</p>
              {duplicateProduct.barcode && (
                <p className="text-xs text-slate-400 font-mono mt-1">Barcode: {duplicateProduct.barcode}</p>
              )}
              <p className="text-xs text-slate-400 mt-1">
                Stock: {duplicateProduct.trackInventory ? duplicateProduct.stockQuantity : 'Not tracked'}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDuplicateProduct(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200">
                Cancel
              </button>
              <button onClick={() => {
                setDuplicateProduct(null)
                setShowAddProduct(false)
                setEditingProduct(duplicateProduct)
              }}
                className="flex-1 py-3 bg-brand-orange text-white rounded-xl font-bold hover:bg-orange-600">
                Edit Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Inventory
