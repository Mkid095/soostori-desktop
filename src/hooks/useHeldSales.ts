import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { HeldSale, CartItem } from '../lib/types'

interface HeldSaleDbRow {
  id: string
  name: string | null
  cart_items: string
  payment_method: string | null
  created_at: string
}

function mapHeldSale(row: HeldSaleDbRow): HeldSale {
  return {
    id: row.id,
    name: row.name ?? undefined,
    cartItems: typeof row.cart_items === 'string'
      ? JSON.parse(row.cart_items)
      : (row.cart_items || []),
    paymentMethod: row.payment_method || 'cash',
    createdAt: row.created_at,
  }
}

export function useHeldSales() {
  return useQuery<HeldSale[]>({
    queryKey: ['heldSales'],
    queryFn: async () => {
      const rows = await api.getHeldSales() as HeldSaleDbRow[]
      return rows.map(mapHeldSale)
    },
  })
}

export function useCreateHeldSale() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sale: { name?: string; cartItems: CartItem[]; paymentMethod: string }) =>
      api.createHeldSale(sale),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heldSales'] })
    },
  })
}

export function useDeleteHeldSale() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteHeldSale(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heldSales'] })
    },
  })
}

export function useRestoreHeldSale() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.restoreHeldSale(id) as Promise<HeldSale | null>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heldSales'] })
    },
  })
}
