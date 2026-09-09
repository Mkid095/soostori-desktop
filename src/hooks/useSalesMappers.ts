/**
 * useSalesMappers.ts — Sale row mappers extracted from useSales.ts per ANPAS.
 * Business logic mappers must NOT live in hooks files (per ANPAS: UI components
 * must NOT contain business logic — mappers are utility logic).
 */

import type { Sale, SaleItem } from '../lib/types'

interface SaleItemDbRow {
  id: string; sale_id: string; product_id: string | null; variation_name: string | null
  product_name: string; quantity: number; unit_price: number; discount: number | null; total_price: number
}

interface SaleDbRow {
  id: string; type: string | null; status: string | null; subtotal: number | null
  discount_amount: number | null; tax_amount: number | null; total_amount: number | null
  paid_amount: number | null; payment_method: string | null; note: string | null
  customer_id_number: string | null; created_at: string; updated_at: string
  items_summary?: string | null; items?: SaleItemDbRow[]
}

export function mapSaleItem(row: SaleItemDbRow): SaleItem {
  return {
    id: row.id, saleId: row.sale_id, productId: row.product_id ?? undefined,
    variationName: row.variation_name ?? undefined, productName: row.product_name,
    quantity: row.quantity, unitPrice: row.unit_price, discount: row.discount ?? 0,
    totalPrice: row.total_price,
  }
}

export function mapSale(row: SaleDbRow): Sale {
  return {
    id: row.id, type: (row.type || 'retail') as Sale['type'],
    status: (row.status || 'completed') as Sale['status'],
    subtotal: row.subtotal ?? 0, discountAmount: row.discount_amount ?? 0,
    taxAmount: row.tax_amount ?? 0, totalAmount: row.total_amount ?? 0,
    paidAmount: row.paid_amount ?? 0,
    paymentMethod: (row.payment_method || 'cash') as Sale['paymentMethod'],
    note: row.note ?? undefined, customerIdNumber: row.customer_id_number ?? undefined,
    createdAt: row.created_at, updatedAt: row.updated_at,
    items_summary: row.items_summary ?? undefined,
    items: Array.isArray(row.items) ? row.items.map(mapSaleItem) : undefined,
  }
}

export type { SaleDbRow, SaleItemDbRow }
