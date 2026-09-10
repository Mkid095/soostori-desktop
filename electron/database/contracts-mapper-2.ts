/**
 * contracts-mapper-2.ts — Commerce mapper (Sale, SaleLineItem, Customer,
 * Debt, DebtPayment). Companion to `contracts-mapper.ts` (identity + inventory)
 * and `contracts-mapper-3.ts` (StockMovement + Expense).
 *
 * Local SQLite ↔ @soostori/contracts. Local columns are NOT renamed.
 *
 * ANPAS: ≤150 lines, no helpers.ts / common.ts / utils.ts.
 */

import type {
  Sale, SaleLineItem, Customer, Debt, DebtPayment,
} from '@soostori/contracts'
import type {
  SaleId, SaleItemId, CustomerId, DebtId, DebtPaymentId,
  UserId, IdempotencyKey, ProductId,
} from '@soostori/core'
import { V1, asBI, asEI, asDI, asPI, bool01 } from './contracts-mapper'

const asSaleI = (s: string): SaleId => s as SaleId
const asLineI = (s: string): SaleItemId => s as SaleItemId
const asCustI = (s: string): CustomerId => s as CustomerId
const asDebtI = (s: string): DebtId => s as DebtId
const asDPI = (s: string): DebtPaymentId => s as DebtPaymentId
const asUI = (s: string): UserId => s as UserId
const asIK = (s: string): IdempotencyKey => s as IdempotencyKey

// ── Sale ← sales ─────────────────────────────────────────────────────────────
export interface SalesRow {
  id: string; shop_id: string; type?: string; status: string
  subtotal: number; discount_amount: number; tax_amount: number
  total_amount: number; paid_amount: number; payment_method: string
  note?: string | null; created_at?: string; updated_at?: string
}
export const fromLocalSale = (r: SalesRow): Sale => ({
  id: asSaleI(r.id), businessId: asBI(r.shop_id),
  type: (r.type as Sale['type']) || 'retail',
  status: (r.status as Sale['status']) || 'completed',
  subtotal: r.subtotal, discountAmount: r.discount_amount, taxAmount: r.tax_amount,
  totalAmount: r.total_amount, paidAmount: r.paid_amount,
  paymentMethod: (r.payment_method as Sale['paymentMethod']) || 'cash',
  note: r.note ?? null, customerId: null, employeeId: asEI(''), deviceId: asDI(''),
  idempotencyKey: asIK(r.id), items: [],
  createdAt: r.created_at ?? new Date().toISOString(),
  updatedAt: r.updated_at ?? new Date().toISOString(),
  confirmedAt: r.updated_at ?? null, version: V1,
})

// ── SaleLineItem ← sale_items ────────────────────────────────────────────────
export interface SaleItemsRow {
  id: string; sale_id: string; shop_id: string; product_id?: string | null
  product_name: string; variation_name?: string | null
  quantity: number; unit_price: number; discount: number; total_price: number
  created_at?: string
}
export const fromLocalSaleLineItem = (r: SaleItemsRow): SaleLineItem => ({
  id: asLineI(r.id), saleId: asSaleI(r.sale_id), businessId: asBI(r.shop_id),
  productId: asPI((r.product_id ?? '') as ProductId),
  productName: r.product_name,
  variationName: r.variation_name ?? null, quantity: r.quantity,
  unitPrice: r.unit_price, discount: r.discount, totalPrice: r.total_price,
  createdAt: r.created_at ?? new Date().toISOString(),
  updatedAt: r.created_at ?? new Date().toISOString(), version: V1,
})

// ── Customer ← customers ─────────────────────────────────────────────────────
export interface CustomersRow {
  id: string; shop_id: string; name: string
  phone?: string | null; email?: string | null; id_number?: string | null
  address?: string | null; notes?: string | null; is_active: number
  created_at?: string; updated_at?: string
}
export const fromLocalCustomer = (r: CustomersRow): Customer => ({
  id: asCustI(r.id), businessId: asBI(r.shop_id), name: r.name,
  phone: r.phone ?? null, email: r.email ?? null, idNumber: r.id_number ?? null,
  address: r.address ?? null, notes: r.notes ?? null, balance: 0,
  status: bool01(r.is_active) ? 'active' : 'inactive',
  createdAt: r.created_at ?? new Date().toISOString(),
  updatedAt: r.updated_at ?? new Date().toISOString(), version: V1,
})
export const toLocalCustomer = (c: Customer): Partial<CustomersRow> => ({
  id: c.id, shop_id: c.businessId, name: c.name, phone: c.phone, email: c.email,
  id_number: c.idNumber, address: c.address, notes: c.notes,
  is_active: c.status === 'active' ? 1 : 0,
})

// ── Debt ← debts ─────────────────────────────────────────────────────────────
export interface DebtsRow {
  id: string; shop_id: string; customer_id: string
  sale_id?: string | null; amount: number; amount_paid: number
  status: string; due_date?: string | null; notes?: string | null
  created_at?: string; updated_at?: string
}
export const fromLocalDebt = (r: DebtsRow): Debt => ({
  id: asDebtI(r.id), businessId: asBI(r.shop_id), customerId: asCustI(r.customer_id),
  saleId: r.sale_id ? asSaleI(r.sale_id) : null,
  amount: r.amount, balance: r.amount - r.amount_paid,
  status: (r.status as Debt['status']) || 'pending',
  dueDate: r.due_date ?? null, notes: r.notes ?? null,
  createdAt: r.created_at ?? new Date().toISOString(),
  updatedAt: r.updated_at ?? new Date().toISOString(), version: V1,
})

// ── DebtPayment ← debt_payments ──────────────────────────────────────────────
export interface DebtPaymentsRow {
  id: string; debt_id: string; amount: number
  payment_method: string; reference?: string | null; created_at: string
}
export const fromLocalDebtPayment = (r: DebtPaymentsRow): DebtPayment => ({
  id: asDPI(r.id), businessId: asBI(''), debtId: asDebtI(r.debt_id),
  amount: r.amount, employeeId: asEI(''),
  paymentMethod: (r.payment_method as DebtPayment['paymentMethod']) || 'cash',
  paymentRef: r.reference ?? null, idempotencyKey: asIK(r.id),
  timestamp: r.created_at,
  createdAt: r.created_at, updatedAt: r.created_at, version: V1,
})