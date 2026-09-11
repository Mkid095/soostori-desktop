import { useState, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useScanner } from '../../hooks/useScanner'
import { useInventoryState } from './hooks/useInventoryState'
import { RestockInline } from './components/RestockInline'
import { ProductFormModal } from './components/ProductFormModal'
import { DuplicateBarcodeModal } from './components/DuplicateBarcodeModal'
import { InventoryHeader } from './components/InventoryHeader'
import { SearchBar } from './components/SearchBar'
import { CategoryChips } from './components/CategoryChips'
import { ProductList } from './components/ProductList'
import { ReceiveStockModal } from './components/ReceiveStockModal'
import { AdjustStockModal } from './components/AdjustStockModal'
import { StockCountScreen } from './components/StockCountScreen'
import { LowStockAlerts, type LowStockAlertItem } from './components/LowStockAlerts'
import { RecentMovementsList } from './components/RecentMovementsList'
import {
  useProducts, useCategories, useAdjustStock, useReceiveStock,
  useCountStock, useStockMovements, useLowStockProducts,
} from '../../hooks/useDatabase'
import type { Product } from '../../lib/types'
import { subscribeHeaderActions } from '../../lib/header-controls-bus'
import { useToast } from '../../hooks/useToast'
import {
  Plus, RefreshCcw, ArrowLeftRight, ClipboardList, Activity,
} from 'lucide-react'

type InventoryAction = 'receive' | 'adjust' | 'count' | null

const Inventory: React.FC = () => {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const { data: products = [], isLoading: productsLoading } = useProducts()
  const { data: categories = [] } = useCategories()
  const adjustStock = useAdjustStock()
  const receiveStock = useReceiveStock()
  const countStock = useCountStock()
  const { data: lowStockRows = [] } = useQuery(useLowStockProducts())

  const {
    stats, filterProducts,
    handleSaveProduct, handleRestock, handleDelete, handleAddCategory,
    createProduct, updateProduct, deleteProduct,
  } = useInventoryState()

  const lowStockAlerts: LowStockAlertItem[] = lowStockRows.map((row: { productId: string; productName: string; currentStock: number; threshold: number }) => ({
    productId: row.productId,
    productName: row.productName,
    currentStock: row.currentStock,
    threshold: row.threshold,
  }))

  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'out'>('all')
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [restockingProduct, setRestockingProduct] = useState<Product | null>(null)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null)
  const [duplicateProduct, setDuplicateProduct] = useState<Product | null>(null)

  // Phase 09: Quick action modals
  const [activeAction, setActiveAction] = useState<InventoryAction>(null)
  const [showMovements, setShowMovements] = useState(false)

  const filteredProducts = filterProducts(searchTerm, categoryFilter, stockStatusFilter)

  const suggestions = useMemo<Product[]>(() => {
    if (!searchTerm.trim()) return []
    return products
      .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .slice(0, 5)
  }, [products, searchTerm])

  // ── Recent movements query ───────────────────────────────────────────
  const { data: recentMovements = [] } = useQuery({
    ...useStockMovements(undefined, 50),
    enabled: showMovements,
  })

  // ── Barcode scanner ───────────────────────────────────────────────────
  const onBarcodeScanned = (barcode: string) => {
    if (!showAddProduct) return
    const existing = products.find(p => p.barcode === barcode)
    if (existing) { setDuplicateProduct(existing); setScannedBarcode(null); return }
    setScannedBarcode(barcode)
  }
  useScanner(onBarcodeScanned)

  // ── Header action listener ───────────────────────────────────────────
  useEffect(() => {
    const handler = () => setShowAddProduct(true)
    window.addEventListener('inventory:add-product', handler)
    return () => window.removeEventListener('inventory:add-product', handler)
  }, [])

  useEffect(() => {
    subscribeHeaderActions((action) => {
      if (action.type === 'inventory:addProduct') setShowAddProduct(true)
    })
  }, [])

  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ value: string }>).detail
      setSearchTerm(detail?.value ?? '')
    }
    window.addEventListener('soostori:app:inventorySearch', listener)
    return () => window.removeEventListener('soostori:app:inventorySearch', listener)
  }, [])

  // ── Handlers ────────────────────────────────────────────────────────
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

  // Phase 09: Receive
  const handleReceiveStock = async (data: { productId: string; quantity: number; supplier?: string; notes?: string }) => {
    try {
      await receiveStock.mutateAsync(data)
      showToast(`Received ${data.quantity} units`, 'success')
      setActiveAction(null)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to receive stock', 'error')
    }
  }

  // Phase 09: Adjust
  const handleAdjustStock = async (data: { productId: string; quantityChange: number; reason: string }) => {
    try {
      await adjustStock.mutateAsync(data)
      showToast(`Stock adjusted by ${data.quantityChange >= 0 ? '+' : ''}${data.quantityChange}`, 'success')
      setActiveAction(null)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to adjust stock', 'error')
    }
  }

  // Phase 09: Count
  const handleCountStock = async (counts: Array<{ productId: string; counted: number }>) => {
    try {
      const result = await countStock.mutateAsync({ counts })
      const adjusted = (result as { adjustments?: Array<{ variance: number }> }).adjustments?.filter((a) => a.variance !== 0).length ?? 0
      showToast(`Count submitted — ${adjusted} adjustment${adjusted !== 1 ? 's' : ''} made`, 'success')
      setActiveAction(null)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to submit count', 'error')
    }
  }

  // Phase 09: Restock from low-stock alert
  const handleRestockFromAlert = (productId: string) => {
    const product = products.find(p => p.id === productId)
    if (product) {
      setRestockingProduct(product)
      setActiveAction(null)
    }
  }

  const isFormOpen = showAddProduct || editingProduct !== null
  const isSavingForm = createProduct.isPending || updateProduct.isPending
  const isSavingRestock = adjustStock.isPending || updateProduct.isPending
  const isActionSaving = receiveStock.isPending || adjustStock.isPending || countStock.isPending

  const openAddProduct = () => { setEditingProduct(null); setShowAddProduct(true) }
  const openEditProduct = (p: Product) => { setEditingProduct(p); setRestockingProduct(null); setShowAddProduct(false) }
  const openRestock = (p: Product) => { setRestockingProduct(p); setEditingProduct(null); setShowAddProduct(false) }

  const handleSelectSuggestion = (p: Product) => {
    setSearchTerm('')
    openEditProduct(p)
  }

  return (
    <div className="h-full bg-bg-primary dark:bg-bg-primary flex flex-col overflow-hidden transition-colors duration-200">
      {/* Phase 09: Low-stock alert banner */}
      <LowStockAlerts
        alerts={lowStockAlerts}
        onRestock={handleRestockFromAlert}
        collapsed={true}
      />

      <InventoryHeader stats={stats} />

      {/* Phase 09: Quick action toolbar */}
      <div className="shrink-0 px-4 py-2 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50">
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mr-1">Actions</span>
        <button
          onClick={() => setActiveAction('receive')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/50 rounded-lg text-[11px] font-bold text-emerald-700 dark:text-emerald-300 transition-colors"
        >
          <Plus size={11} />Receive
        </button>
        <button
          onClick={() => setActiveAction('adjust')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800/50 rounded-lg text-[11px] font-bold text-amber-700 dark:text-amber-300 transition-colors"
        >
          <RefreshCcw size={11} />Adjust
        </button>
        <button
          onClick={() => setActiveAction('count')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-900/40 border border-violet-200 dark:border-violet-800/50 rounded-lg text-[11px] font-bold text-violet-700 dark:text-violet-300 transition-colors"
        >
          <ClipboardList size={11} />Count
        </button>
        <button
          onClick={() => setShowMovements(m => !m)}
          className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-[11px] font-bold transition-colors ${
            showMovements
              ? 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'
              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          <Activity size={11} />Movements
        </button>
        <div className="flex-1" />
        <SearchBar
          searchTerm={searchTerm} categoryFilter={categoryFilter} stockStatusFilter={stockStatusFilter} categories={categories}
          suggestions={suggestions}
          onSearchChange={setSearchTerm} onCategoryChange={setCategoryFilter}
          onStockStatusChange={setStockStatusFilter}
          onAddClick={openAddProduct}
          onSelectSuggestion={handleSelectSuggestion}
        />
      </div>

      {/* Phase 09: Recent movements panel */}
      {showMovements && (
        <div className="shrink-0 max-h-48 overflow-y-auto border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/30">
          <RecentMovementsList movements={recentMovements} />
        </div>
      )}

      <CategoryChips categories={categories} selected={categoryFilter} onSelect={setCategoryFilter} />

      <div className="flex-1 overflow-y-auto">
        {restockingProduct && (
          <RestockInline product={restockingProduct} onSave={handleFormRestock}
            onCancel={() => setRestockingProduct(null)} isSaving={isSavingRestock} />
        )}
        <ProductList
          products={filteredProducts} isLoading={productsLoading}
          onEdit={openEditProduct} onRestock={openRestock}
          onDelete={handleDelete} isDeleting={deleteProduct.isPending}
        />
      </div>

      {/* Phase 09: Quick action modals */}
      {activeAction === 'receive' && (
        <ReceiveStockModal
          products={products}
          onReceive={handleReceiveStock}
          onClose={() => setActiveAction(null)}
          isSaving={isActionSaving}
        />
      )}
      {activeAction === 'adjust' && (
        <AdjustStockModal
          products={products}
          onAdjust={handleAdjustStock}
          onClose={() => setActiveAction(null)}
          isSaving={isActionSaving}
        />
      )}
      {activeAction === 'count' && (
        <StockCountScreen
          products={products}
          onCount={handleCountStock}
          onClose={() => setActiveAction(null)}
          isSaving={isActionSaving}
        />
      )}

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
