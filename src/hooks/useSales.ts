import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Sale, SaleItem } from '../lib/types'

interface SaleItemDbRow {
  id: string
  sale_id: string
  product_id: string | null
  variation_name: string | null
  product_name: string
  quantity: number
  unit_price: number
  discount: number | null
  total_price: number
}

interface SaleDbRow {
  id: string
  type: string | null
  status: string | null
  subtotal: number | null
  discount_amount: number | null
  tax_amount: number | null
  total_amount: number | null
  paid_amount: number | null
  payment_method: string | null
  note: string | null
  created_at: string
  updated_at: string
  items_summary?: string | null
  items?: SaleItemDbRow[]
}

function mapSaleItem(row: SaleItemDbRow): SaleItem {
  return {
    id: row.id,
    saleId: row.sale_id,
    productId: row.product_id ?? undefined,
    variationName: row.variation_name ?? undefined,
    productName: row.product_name,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    discount: row.discount ?? 0,
    totalPrice: row.total_price,
  }
}

function mapSale(row: SaleDbRow): Sale {
  return {
    id: row.id,
    type: (row.type || 'retail') as Sale['type'],
    status: (row.status || 'completed') as Sale['status'],
    subtotal: row.subtotal ?? 0,
    discountAmount: row.discount_amount ?? 0,
    taxAmount: row.tax_amount ?? 0,
    totalAmount: row.total_amount ?? 0,
    paidAmount: row.paid_amount ?? 0,
    paymentMethod: (row.payment_method || 'cash') as Sale['paymentMethod'],
    note: row.note ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items_summary: row.items_summary ?? undefined,
    items: Array.isArray(row.items) ? row.items.map(mapSaleItem) : undefined,
  }
}

export function useSales(limit: number = 100) {
  return useQuery<Sale[]>({
    queryKey: ['sales', limit],
    queryFn: async () => {
      const rows = await api.getSales(undefined, limit) as SaleDbRow[]
      return rows.map(mapSale)
    },
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

export function useCreateSale() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sale: {
      items: any[]
      subtotal: number
      discountAmount: number
      totalAmount: number
      paymentMethod: string
      paidAmount?: number
      note?: string
      customerId?: string
      customerName?: string
      customerPhone?: string
    }) => api.createSale(sale),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
