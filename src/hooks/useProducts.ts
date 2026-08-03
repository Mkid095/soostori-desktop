import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Product } from '../lib/types'
import { mapProductRow, type ProductDbRow } from './product-mapper'

export function useProducts() {
  return useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const rows = (await api.getProducts()) as ProductDbRow[]
      return rows.map(mapProductRow)
    },
  })
}

export function useProduct(id: string) {
  return useQuery<Product | null>({
    queryKey: ['product', id],
    queryFn: async () => {
      const row = (await api.getProductById(id)) as ProductDbRow | null
      return row ? mapProductRow(row) : null
    },
    enabled: !!id,
  })
}

export function useProductByBarcode(barcode: string) {
  return useQuery<Product | null>({
    queryKey: ['product', 'barcode', barcode],
    queryFn: async () => {
      const row = (await api.getProductByBarcode(barcode)) as ProductDbRow | null
      return row ? mapProductRow(row) : null
    },
    enabled: !!barcode,
  })
}

export function useSearchProducts(query: string) {
  return useQuery<Product[]>({
    queryKey: ['products', 'search', query],
    queryFn: async () => {
      const rows = (await api.searchProducts(query)) as ProductDbRow[]
      return rows.map(mapProductRow)
    },
    enabled: query.length > 0,
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (product: Partial<Product>) => api.createProduct(product),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) =>
      api.updateProduct(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product', id] })
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
