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

export function useStockMovements(productId?: string, limit: number = 100) {
  return {
    queryKey: ['stockMovements', productId, limit] as const,
    queryFn: async () => {
      const rows = await api.getStockMovements(productId, limit) as StockMovementDbRow[]
      return rows.map(mapStockMovement)
    },
  }
}
