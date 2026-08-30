import { useState, useEffect, useMemo } from 'react'
import { useScanner } from '../../hooks/useScanner'
import { useInventoryState } from './hooks/useInventoryState'
import { RestockInline } from './components/RestockInline'
import { ProductFormModal } from './components/ProductFormModal'
import { DuplicateBarcodeModal } from './components/DuplicateBarcodeModal'
import { InventoryHeader } from './components/InventoryHeader'
import { SearchBar } from './components/SearchBar'
import { CategoryChips } from './components/CategoryChips'
import { ProductList } from './components/ProductList'
import type { Product } from '../../lib/types'
import { subscribeHeaderActions } from '../../lib/header-controls-bus'

const Inventory: React.FC = () => {
  const {
    products, categories, isLoading, stats,
    filterProducts,
    handleSaveProduct, handleRestock, handleDelete, handleAddCategory,
    createProduct, updateProduct, deleteProduct, adjustStock,
  } = useInventoryState()

  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [restockingProduct, setRestockingProduct] = useState<Product | null>(null)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null)
  const [duplicateProduct, setDuplicateProduct] = useState<Product | null>(null)

  const filteredProducts = filterProducts(searchTerm, categoryFilter)

  const suggestions = useMemo<Product[]>(() => {
    if (!searchTerm.trim()) return []
    return products
      .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .slice(0, 5)
  }, [products, searchTerm])

  // Listen for "Add Product" trigger from App header button
  useEffect(() => {
    const handler = () => setShowAddProduct(true)
    window.addEventListener('inventory:add-product', handler)
    return () => window.removeEventListener('inventory:add-product', handler)
  }, [])

  // Barcode scanner: only active when form is open for new product
  const onBarcodeScanned = (barcode: string) => {
    if (!showAddProduct) return
    const existing = products.find(p => p.barcode === barcode)
    if (existing) { setDuplicateProduct(existing); setScannedBarcode(null); return }
    setScannedBarcode(barcode)
  }
  useScanner(onBarcodeScanned)

  const handleCloseForm = () => { setEditingProduct(null); setShowAddProduct(false); setScannedBarcode(null) }

  const handleFormSave = async (data: Partial<Product>) => {
    await handleSaveProduct(data, editingProduct?.id)
    handleCloseForm()
  }

  const handleFormRestock = async (qtyChange: number, reason: string, newBuy?: number, newSell?: number) => {
    if (!restockingProduct) return
    await handleRestock(restockingProduct.id, qtyChange, reason, newBuy, newSell)
    setRestockingProduct(null)
  }

  const handleDuplicateEdit = () => {
    setDuplicateProduct(null); setShowAddProduct(false); setEditingProduct(duplicateProduct)
  }

  const isFormOpen = showAddProduct || editingProduct !== null
  const isSavingForm = createProduct.isPending || updateProduct.isPending
  const isSavingRestock = adjustStock.isPending || updateProduct.isPending

  const openAddProduct = () => { setEditingProduct(null); setShowAddProduct(true) }
  const openEditProduct = (p: Product) => { setEditingProduct(p); setRestockingProduct(null); setShowAddProduct(false) }
  const openRestock = (p: Product) => { setRestockingProduct(p); setEditingProduct(null); setShowAddProduct(false) }

  const handleSelectSuggestion = (p: Product) => {
    setSearchTerm('')
    openEditProduct(p)
  }

  useEffect(() => subscribeHeaderActions((action) => {
    if (action.type === 'inventory:addProduct') openAddProduct()
  }), [])

  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ value: string }>).detail
      setSearchTerm(detail?.value ?? '')
    }
    window.addEventListener('soostori:app:inventorySearch', listener)
    return () => window.removeEventListener('soostori:app:inventorySearch', listener)
  }, [])

  return (
    <div className="h-full bg-bg-primary dark:bg-bg-primary flex flex-col overflow-hidden transition-colors duration-200">
      <InventoryHeader stats={stats} />
      <SearchBar
        searchTerm={searchTerm} categoryFilter={categoryFilter} categories={categories}
        suggestions={suggestions}
        onSearchChange={setSearchTerm} onCategoryChange={setCategoryFilter}
        onAddClick={openAddProduct}
        onSelectSuggestion={handleSelectSuggestion}
      />
      <CategoryChips categories={categories} selected={categoryFilter} onSelect={setCategoryFilter} />

      <div className="flex-1 overflow-y-auto">
        {restockingProduct && (
          <RestockInline product={restockingProduct} onSave={handleFormRestock}
            onCancel={() => setRestockingProduct(null)} isSaving={isSavingRestock} />
        )}
        <ProductList
          products={filteredProducts} isLoading={isLoading}
          onEdit={openEditProduct} onRestock={openRestock}
          onDelete={handleDelete} isDeleting={deleteProduct.isPending}
        />
      </div>

      {isFormOpen && (
        <ProductFormModal
          product={editingProduct} categories={categories}
          onSave={handleFormSave} onClose={handleCloseForm}
          isSaving={isSavingForm} onAddCategory={handleAddCategory}
          initialBarcode={scannedBarcode || undefined}
          onBarcodeFound={(found) => {
            setScannedBarcode(null)
            setEditingProduct(found)
          }}
        />
      )}

      {duplicateProduct && (
        <DuplicateBarcodeModal product={duplicateProduct}
          onCancel={() => setDuplicateProduct(null)} onEdit={handleDuplicateEdit} />
      )}
    </div>
  )
}

export default Inventory
