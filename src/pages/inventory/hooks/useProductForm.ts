import { useState, useCallback, useRef, useEffect } from 'react'
import type { Product } from '../../../lib/types'
import { useProductFormPricing } from './useProductFormPricing'
import { useGroupPrices } from './useGroupPrices'
import { productToForm, buildProductData, isProductFormValid, ProductFormMode, ProductFormState } from './productFormMappers'

export type { ProductFormMode, ProductFormState }

const EMPTY_FORM: ProductFormState = {
  name: '', sku: '', barcode: '', categoryId: '', unit: 'piece',
  distributorName: '', distributorPhone: '',
  costPrice: '0', sellingPrice: '0', stockQuantity: '0', lowStockThreshold: '10',
  trackInventory: true, allowSingleUnitSale: true,
  unitsPerPackage: '', boxBuyingPrice: '', bulkSellingPrice: '',
}

interface UseProductFormOptions {
  onBarcodeLookup?: (barcode: string) => Promise<Product | null>
  onBarcodeFound?: (product: Product) => void
}

export function useProductForm(product: Product | null, initialBarcode?: string, options?: UseProductFormOptions) {
  const [mode, setMode] = useState<ProductFormMode>(product?.unitsPerPackage ? 'bulk' : 'loose')
  const [form, setForm] = useState<ProductFormState>(product ? productToForm(product) : EMPTY_FORM)
  const { groupPrices, addGroupPrice, updateGroupPrice, removeGroupPrice } = useGroupPrices(
    product?.groupPrices?.map(gp => ({ quantity: gp.minQuantity, price: gp.price }))
  )
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || '')
  const [imagePreview, setImagePreview] = useState<string | null>(product?.imageUrl || null)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState('#F97316')
  const [addingCategory, setAddingCategory] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const barcodeInputRef = useRef<HTMLInputElement>(null)

  const { costPerUnit, handleBulkPriceChange } = useProductFormPricing(mode, form, setForm)

  useEffect(() => {
    if (initialBarcode && !product?.id && options?.onBarcodeLookup) {
      options.onBarcodeLookup(initialBarcode).then(found => {
        if (found) {
          setForm(productToForm(found))
          setMode(found.unitsPerPackage ? 'bulk' : 'loose')
          setImageUrl(found.imageUrl || '')
          setImagePreview(found.imageUrl || null)
          options.onBarcodeFound?.(found)
        } else {
          setForm(f => ({ ...f, barcode: initialBarcode }))
          barcodeInputRef.current?.focus()
        }
      })
    }
  }, [initialBarcode, product?.id])

  const updateField = useCallback(<K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => {
    setForm(f => ({ ...f, [key]: value }))
  }, [])

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string)
      setImageUrl(ev.target?.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleAddCategory = useCallback(async (onAdd: (name: string, color: string) => void) => {
    if (!newCategoryName.trim()) return
    setAddingCategory(true)
    await onAdd(newCategoryName.trim(), newCategoryColor)
    setNewCategoryName(''); setShowAddCategory(false); setAddingCategory(false)
  }, [newCategoryName, newCategoryColor])

  return {
    mode, setMode, form, setForm, updateField, groupPrices,
    imageUrl, imagePreview, fileInputRef, barcodeInputRef,
    showAddCategory, setShowAddCategory,
    newCategoryName, setNewCategoryName, newCategoryColor, setNewCategoryColor, addingCategory,
    costPerUnit, handleImageSelect, clearImage: () => { setImagePreview(null); setImageUrl('') },
    generateBarcode: () => setForm(f => ({ ...f, barcode: `SOO${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}` })),
    addGroupPrice, updateGroupPrice, removeGroupPrice, handleAddCategory, handleBulkPriceChange,
    buildProductData: () => buildProductData(mode, form, groupPrices, imageUrl),
    isValid: () => isProductFormValid(mode, form),
  }
}
