import type { GroupPrice, Product, ProductMetadata } from '../lib/types'

export interface ProductDbRow {
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

function parseJsonField<T>(value: string | null | T | undefined): T | undefined {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'string') {
    try { return JSON.parse(value) as T } catch { return undefined }
  }
  return value
}

export function mapProductRow(row: ProductDbRow): Product {
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
    metadata: parseJsonField<ProductMetadata>(row.metadata),
    isActive: !!row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    distributorName: row.distributor_name ?? undefined,
    distributorPhone: row.distributor_phone ?? undefined,
    allowSingleUnitSale: row.allow_single_unit_sale !== 0,
    unitsPerPackage: row.units_per_package ?? undefined,
    boxBuyingPrice: row.box_buying_price ?? undefined,
    bulkSellingPrice: row.bulk_selling_price ?? undefined,
    groupPrices: parseJsonField<GroupPrice[]>(row.group_prices),
  }
}
