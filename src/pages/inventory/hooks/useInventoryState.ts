import { useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useProducts, useCategories, useCreateProduct, useUpdateProduct,
  useDeleteProduct, useAdjustStock, useCreateCategory,
} from '../../../hooks/useDatabase'
import type { Product } from '../../../lib/types'
import { useToast } from '../../../hooks/useToast'

export interface InventoryStats {
  total: number
  low: number
  out: number
}

export function useInventoryState() {
  const queryClient = useQueryClient()
  const { data: products = [], isLoading } = useProducts()
  const { data: categories = [] } = useCategories()
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const deleteProduct = useDeleteProduct()
  const adjustStock = useAdjustStock()
  const createCategory = useCreateCategory()
  const { showToast } = useToast()

  const stats = useMemo<InventoryStats>(() => ({
    total: products.filter(p => p.isActive).length,
    low: products.filter(p =>
      p.trackInventory && p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold
    ).length,
    out: products.filter(p =>
      p.trackInventory && p.stockQuantity <= 0
    ).length,
  }), [products])

  function filterProducts(search: string, categoryId: string) {
    return products.filter((p) => {
      const matchesSearch = !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase())) ||
        (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
      const matchesCategory = categoryId === 'ALL' || p.categoryId === categoryId
      return matchesSearch && matchesCategory && p.isActive
    })
  }

  const handleSaveProduct = useCallback(async (data: Partial<Product>, editingId?: string) => {
    try {
      if (editingId) {
        await updateProduct.mutateAsync({ id: editingId, data })
        showToast('Product updated', 'success')
      } else {
        await createProduct.mutateAsync(data)
        showToast('Product saved', 'success')
      }
      await queryClient.refetchQueries({ queryKey: ['products'] })
    } catch (err) {
      console.error('Save product failed:', err)
      showToast(err instanceof Error ? err.message : 'Failed to save product', 'error')
    }
  }, [createProduct, updateProduct, queryClient, showToast])

  const handleRestock = useCallback(async (
    productId: string,
    qtyChange: number,
    reason: string,
    newBuyPrice?: number,
    newSellPrice?: number
  ) => {
    try {
      if (newBuyPrice !== undefined || newSellPrice !== undefined) {
        const updateData: Partial<Product> = {}
        if (newBuyPrice !== undefined) updateData.costPrice = newBuyPrice
        if (newSellPrice !== undefined) updateData.sellingPrice = newSellPrice
        await updateProduct.mutateAsync({ id: productId, data: updateData })
      }
      await adjustStock.mutateAsync({ productId, quantityChange: qtyChange, reason })
      showToast('Stock updated', 'success')
    } catch (err) {
      console.error('Restock failed:', err)
      showToast(err instanceof Error ? err.message : 'Failed to update stock', 'error')
    }
  }, [adjustStock, updateProduct, showToast])

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteProduct.mutateAsync(id)
      showToast('Product deleted', 'success')
    } catch (err) {
      console.error('Delete product failed:', err)
      showToast(err instanceof Error ? err.message : 'Failed to delete product', 'error')
    }
  }, [deleteProduct, showToast])

  const handleAddCategory = useCallback(async (name: string, color: string) => {
    try {
      await createCategory.mutateAsync({ name, color })
      showToast('Category added', 'success')
    } catch (err) {
      console.error('Add category failed:', err)
      showToast(err instanceof Error ? err.message : 'Failed to add category', 'error')
    }
  }, [createCategory, showToast])

  function handleBarcodeScanned(barcode: string, showAddProduct: boolean, setScannedBarcode: (b: string | null) => void, setDuplicate: (p: Product | null) => void) {
    if (!showAddProduct) return
    const existing = products.find(p => p.barcode === barcode)
    if (existing) {
      setDuplicate(existing)
      setScannedBarcode(null)
      return
    }
    setScannedBarcode(barcode)
  }

  return {
    products,
    categories,
    isLoading,
    stats,
    filterProducts,
    handleSaveProduct,
    handleRestock,
    handleDelete,
    handleAddCategory,
    handleBarcodeScanned,
    createProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
  }
}
