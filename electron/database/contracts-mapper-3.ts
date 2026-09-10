/**
 * contracts-mapper-3.ts — StockMovement + Expense mapper (Cycle 04 Sub-C).
 *
 * Companion to `contracts-mapper.ts` (identity + inventory core) and
 * `contracts-mapper-2.ts` (commerce). Local columns are NOT renamed.
 *
 * ANPAS: ≤150 lines, no helpers.ts / common.ts / utils.ts.
 */

import type { StockMovement, Expense } from '@soostori/contracts'
import type {
  DeviceId, StockMovementId, ExpenseId, UserId, IdempotencyKey, BusinessId, EmployeeId,
} from '@soostori/core'
import { V1, asBI, asDI, asEI, asPI, safeJson } from './contracts-mapper'

const asSMI = (s: string): StockMovementId => s as StockMovementId
const asExI = (s: string): ExpenseId => s as ExpenseId
const asUI = (s: string): UserId => s as UserId
const asIK = (s: string): IdempotencyKey => s as IdempotencyKey

// ── StockMovement ← inventory_transactions ───────────────────────────────────
export interface InventoryTxRow {
  id: string; shop_id: string; product_id: string; quantity: number
  event_type: string; device_id: string; user_id: string
  idempotency_key?: string | null; timestamp?: string | null
  payload?: string | null; created_at: string; version?: number
}
const normalizeOp = (e: string): StockMovement['operation'] => {
  const m: Record<string, StockMovement['operation']> = {
    sold: 'sale', received: 'purchase', returned: 'return',
    adjusted: 'adjustment', damaged: 'damage', transferred: 'transfer',
    correction: 'correction', opening: 'openingStock',
  }
  return m[e] ?? (e as StockMovement['operation'])
}
export const fromLocalStockMovement = (r: InventoryTxRow): StockMovement => ({
  id: asSMI(r.id), businessId: asBI(r.shop_id), productId: asPI(r.product_id),
  quantity: r.quantity, operation: normalizeOp(r.event_type),
  deviceId: asDI(r.device_id), userId: asUI(r.user_id),
  idempotencyKey: asIK(r.idempotency_key ?? r.id),
  timestamp: r.timestamp ?? r.created_at,
  notes: safeJson<{ notes?: string }>(r.payload, {}).notes ?? null,
  createdAt: r.created_at, version: r.version ?? V1,
})

// ── Expense ← expenses ───────────────────────────────────────────────────────
export interface ExpensesRow {
  id: string; shop_id: string; category: string; amount: number
  note?: string; date: string; created_at?: string
}
export const fromLocalExpense = (r: ExpensesRow): Expense => ({
  id: asExI(r.id), businessId: asBI(r.shop_id), categoryName: r.category,
  amount: r.amount, employeeId: asEI(''), note: r.note ?? null,
  date: r.date, reference: null,
  createdAt: r.created_at ?? new Date().toISOString(),
  updatedAt: r.created_at ?? new Date().toISOString(), version: V1,
})
export const toLocalExpense = (e: Expense): Partial<ExpensesRow> => ({
  id: e.id, shop_id: e.businessId, category: e.categoryName,
  amount: e.amount, note: e.note ?? '', date: e.date,
})

// ── Internal: BusinessId / EmployeeId / DeviceId brand re-exports ────────────
// (re-exported so other mapper files can pull them through contracts-mapper-3
//  if they prefer a single import root)
export type { BusinessId, EmployeeId, DeviceId }