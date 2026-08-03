import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Product } from '../lib/types'

interface ProductDbRow {
  id: string
  category_id: string | null
  category_name: string | null
  category_color: string | null
  category_icon: string | null
  name: string
  sku: string | null
  barcode: string | null
  barcode_generated: number | null
  description: string | null
  image_url: string | null
  cost_price: number | null
  selling_price: number
  discount_price: number | null
  unit: string | null
  stock_quantity: number | null
  low_stock_threshold: number | null
  track_inventory: number | null
  has_variants: number | null
  parent_variant_id: string | null
  expiry_date: string | null
  metadata: string | null
  is_active: number | null
  created_at: string
  updated_at: string
  distributor_name: string | null
  distributor_phone: string | null
  allow_single_unit_sale: number | null
  units_per_package: number | null
  box_buying_price: number | null
  bulk_selling_price: number | null
  group_prices: string | null
}

function mapProduct(row: ProductDbRow): Product {
  return {
    id: row.id,
    categoryId: row.category_id ?? undefined,
    categoryName: row.category_name ?? undefined,
    categoryColor: row.category_color ?? undefined,
    categoryIcon: row.category_icon ?? undefined,
    name: row.name,
    sku: row.sku ?? undefined,
    barcode: row.barcode ?? undefined,
    barcodeGenerated: !!row.barcode_generated,
    description: row.description ?? undefined,
    imageUrl: row.image_url ?? undefined,
    costPrice: row.cost_price ?? 0,
    sellingPrice: row.selling_price ?? 0,
    discountPrice: row.discount_price ?? undefined,
    unit: row.unit || 'piece',
    stockQuantity: row.stock_quantity ?? 0,
    lowStockThreshold: row.low_stock_threshold ?? 5,
    trackInventory: !!row.track_inventory,
    hasVariants: !!row.has_variants,
    parentVariantId: row.parent_variant_id ?? undefined,
    expiryDate: row.expiry_date ?? undefined,
    metadata: row.metadata
      ? typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
      : undefined,
    isActive: !!row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    distributorName: row.distributor_name ?? undefined,
    distributorPhone: row.distributor_phone ?? undefined,
    allowSingleUnitSale: row.allow_single_unit_sale !== 0,
    unitsPerPackage: row.units_per_package ?? undefined,
    boxBuyingPrice: row.box_buying_price ?? undefined,
    bulkSellingPrice: row.bulk_selling_price ?? undefined,
    groupPrices: row.group_prices
      ? typeof row.group_prices === 'string' ? JSON.parse(row.group_prices) : row.group_prices
      : undefined,
  }
}

export function useProducts() {
  return useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const rows = await api.getProducts() as ProductDbRow[]
      return rows.map(mapProduct)
    },
  })
}

export function useProduct(id: string) {
  return useQuery<Product | null>({
    queryKey: ['product', id],
    queryFn: async () => {
      const row = await api.getProductById(id) as ProductDbRow | null
      return row ? mapProduct(row) : null
    },
    enabled: !!id,
  })
}

export function useProductByBarcode(barcode: string) {
  return useQuery<Product | null>({
    queryKey: ['product', 'barcode', barcode],
    queryFn: async () => {
      const row = await api.getProductByBarcode(barcode) as ProductDbRow | null
      return row ? mapProduct(row) : null
    },
    enabled: !!barcode,
  })
}

export function useSearchProducts(query: string) {
  return useQuery<Product[]>({
    queryKey: ['products', 'search', query],
    queryFn: async () => {
      const rows = await api.searchProducts(query) as ProductDbRow[]
      return rows.map(mapProduct)
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
