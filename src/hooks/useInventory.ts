import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { StockMovement } from '../lib/types'

interface StockMovementDbRow {
  id: string
  product_id: string
  product_name: string | null
  type: string
  quantity: number | null
  balance_after: number | null
  reason: string | null
  reference_id: string | null
  created_at: string
  created_by: string | null
}

interface LowStockRow {
  id: string
  name: string
  current_stock: number
  low_stock_threshold: number
}

function mapStockMovement(row: StockMovementDbRow): StockMovement {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name ?? undefined,
    type: row.type as StockMovement['type'],
    quantity: row.quantity ?? 0,
    balanceAfter: row.balance_after ?? 0,
    reason: row.reason ?? undefined,
    referenceId: row.reference_id ?? undefined,
    createdAt: row.created_at,
    createdBy: row.created_by ?? undefined,
  }
}

export function useAdjustStock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      productId,
      quantityChange,
      reason,
    }: {
      productId: string
      quantityChange: number
      reason: string
    }) => api.adjustStock(productId, quantityChange, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['stockMovements'] })
    },
  })
}

export function useReceiveStock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { productId: string; quantity: number; supplier?: string; notes?: string }) =>
      api.receiveStock(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['stockMovements'] })
    },
  })
}

export function useTransferStock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { productId: string; fromBusinessId: string; toBusinessId: string; quantity: number }) =>
      api.transferStock(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['stockMovements'] })
    },
  })
}

export function useCountStock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { counts: Array<{ productId: string; counted: number }> }) =>
      api.countStock(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['stockMovements'] })
    },
  })
}

export function useLowStockProducts() {
  return {
    queryKey: ['lowStockProducts'] as const,
    queryFn: async () => {
      const rows = await api.getLowStockProducts() as LowStockRow[]
      return rows.map(row => ({
        productId: row.id,
        productName: row.name,
        currentStock: row.current_stock,
        threshold: row.low_stock_threshold,
      }))
    },
  }
}

export function useStockMovements(productId?: string, limit: number = 100) {
  return {
    queryKey: ['stockMovements', productId, limit] as const,
    queryFn: async () => {
      const rows = await api.getStockMovements(productId, limit) as StockMovementDbRow[]
      return rows.map(mapStockMovement)
    },
  }
}
