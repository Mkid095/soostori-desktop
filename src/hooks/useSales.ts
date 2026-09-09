/**
 * useSales.ts — TanStack Query hooks for sale data.
 * Row mappers extracted to useSalesMappers.ts per ANPAS.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Sale } from '../lib/types'
import { mapSale, type SaleDbRow } from './useSalesMappers'

export function useSales(limit?: number) {
  return useQuery<Sale[]>({
    queryKey: ['sales', limit],
    queryFn: async () => {
      const rows = await api.getSales(undefined, limit) as SaleDbRow[]
      return rows.map(mapSale)
    },
  })
}

export function useSalesTotal() {
  return useQuery<number>({
    queryKey: ['sales', 'total'],
    queryFn: async () => {
      const rows = await api.getSales(undefined, 0) as SaleDbRow[]
      return rows.length
    },
    staleTime: 30_000,
  })
}

export function useSale(id: string) {
  return useQuery<Sale | null>({
    queryKey: ['sale', id],
    queryFn: async () => {
      const row = await api.getSaleById(id) as SaleDbRow | null
      return row ? mapSale(row) : null
    },
    enabled: !!id,
  })
}

export interface CartLineItem {
  productId: string; productName: string; quantity: number; unitPrice: number
  totalPrice: number; discount: number; variationName?: string
  isCombo?: boolean; comboId?: string; metadata?: Record<string, unknown>
}

export function useTopProducts(startDate: string, endDate: string, limit = 10) {
  return useQuery<{ product_name: string; totalQty: number; totalRevenue: number }[]>({
    queryKey: ['topProducts', startDate, endDate, limit],
    queryFn: async () => await api.getTopProducts(startDate, endDate, limit) as { product_name: string; totalQty: number; totalRevenue: number }[],
  })
}

export function useRefundSale() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (saleId: string) => api.refundSale(saleId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sales'] }); queryClient.invalidateQueries({ queryKey: ['products'] }) },
    onError: () => { queryClient.invalidateQueries({ queryKey: ['sales'] }) },
  })
}

export function useCreateSale() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sale: {
      items: CartLineItem[]; subtotal: number; discountAmount: number
      totalAmount: number; paymentMethod: string; paidAmount?: number
      note?: string; customerId?: string; customerName?: string
      customerPhone?: string; customerIdNumber?: string
    }) => api.createSale(sale),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sales'] }); queryClient.invalidateQueries({ queryKey: ['products'] }) },
  })
}
