/**
 * sync-event-builder.ts — Pure factory for SyncEvents.
 *
 * Cycle 04 Sub-cycle F: extracted from sale-create-handlers.ts so the
 * SyncEvent shape is unit-testable without instantiating the IPC handler,
 * the SQLite database, or the sales orchestrator. The handler invokes
 * this after the SQLite INSERT succeeds and passes the result to
 * defaultSyncEngine.enqueue().
 *
 * Phase 11: Added Debt + DebtPayment sync event builders.
 *
 * ANPAS: ≤150 lines per block.
 */

import { v4 as uuidv4 } from 'uuid'
import { asBusinessId, asSaleId, asEmployeeId, asDeviceId, asSyncEventId, asIdempotencyKey,
  asProductId, asCategoryId, asExpenseId } from '@soostori/core'
import type { SyncEvent } from '@soostori/contracts'
import type { Sale, Debt, DebtPayment, Expense } from '@soostori/contracts'
import type { BusinessId, DeviceId, EmployeeId } from '@soostori/core'

// ── Sale ───────────────────────────────────────────────────────────────────────

export interface SaleSyncEventContext {
  businessId: BusinessId
  originatingDeviceId: DeviceId
  originatingEmployeeId: EmployeeId
  clientSequence: number
}

export const buildSaleSyncEvent = (
  sale: Sale,
  ctx: SaleSyncEventContext,
): SyncEvent => ({
  id: asSyncEventId(uuidv4()),
  idempotencyKey: asIdempotencyKey(sale.idempotencyKey),
  businessId: asBusinessId(sale.businessId),
  entityKind: 'sale',
  entityId: asSaleId(sale.id),
  operation: 'create',
  originatingDeviceId: asDeviceId(ctx.originatingDeviceId),
  originatingEmployeeId: asEmployeeId(ctx.originatingEmployeeId),
  clientSequence: ctx.clientSequence,
  clientCreatedAt: new Date().toISOString(),
  entityVersion: sale.version,
  payload: sale as unknown as Record<string, unknown>,
  state: 'pending',
})

// ── Product ────────────────────────────────────────────────────────────────────

export interface ProductSyncEventContext {
  businessId: BusinessId
  originatingDeviceId: DeviceId
  originatingEmployeeId: EmployeeId
  clientSequence: number
}

export const buildProductSyncEvent = (
  operation: 'create' | 'update' | 'delete' | 'tombstone',
  product: { id: string; version: number; [key: string]: unknown },
  ctx: ProductSyncEventContext,
): SyncEvent => ({
  id: asSyncEventId(uuidv4()),
  idempotencyKey: asIdempotencyKey(`${operation}:product:${product.id}`),
  businessId: asBusinessId(ctx.businessId),
  entityKind: 'product',
  entityId: asProductId(product.id),
  operation,
  originatingDeviceId: asDeviceId(ctx.originatingDeviceId),
  originatingEmployeeId: asEmployeeId(ctx.originatingEmployeeId),
  clientSequence: ctx.clientSequence,
  clientCreatedAt: new Date().toISOString(),
  entityVersion: product.version,
  payload: product as Record<string, unknown>,
  state: 'pending',
})

// ── Category ───────────────────────────────────────────────────────────────────

export interface CategorySyncEventContext {
  businessId: BusinessId
  originatingDeviceId: DeviceId
  originatingEmployeeId: EmployeeId
  clientSequence: number
}

export const buildCategorySyncEvent = (
  operation: 'create' | 'update',
  category: { id: string; version: number; [key: string]: unknown },
  ctx: CategorySyncEventContext,
): SyncEvent => ({
  id: asSyncEventId(uuidv4()),
  idempotencyKey: asIdempotencyKey(`${operation}:category:${category.id}`),
  businessId: asBusinessId(ctx.businessId),
  entityKind: 'category',
  entityId: asCategoryId(category.id),
  operation,
  originatingDeviceId: asDeviceId(ctx.originatingDeviceId),
  originatingEmployeeId: asEmployeeId(ctx.originatingEmployeeId),
  clientSequence: ctx.clientSequence,
  clientCreatedAt: new Date().toISOString(),
  entityVersion: category.version,
  payload: category as Record<string, unknown>,
  state: 'pending',
})

// ── Stock ───────────────────────────────────────────────────────────────────────

export interface StockSyncEventContext {
  businessId: BusinessId
  originatingDeviceId: DeviceId
  originatingEmployeeId: EmployeeId
  clientSequence: number
}

export const buildStockSyncEvent = (
  productId: string,
  quantityBefore: number,
  quantityAfter: number,
  reason: string,
  ctx: StockSyncEventContext,
): SyncEvent => ({
  id: asSyncEventId(uuidv4()),
  idempotencyKey: asIdempotencyKey(`stock-adjusted:${productId}:${ctx.clientSequence}`),
  businessId: asBusinessId(ctx.businessId),
  entityKind: 'product',
  entityId: asProductId(productId),
  operation: 'update',
  originatingDeviceId: asDeviceId(ctx.originatingDeviceId),
  originatingEmployeeId: asEmployeeId(ctx.originatingEmployeeId),
  clientSequence: ctx.clientSequence,
  clientCreatedAt: new Date().toISOString(),
  entityVersion: Date.now(),
  payload: {
    id: productId,
    current_stock: quantityAfter,
    stock_quantity: quantityAfter,
    quantity_delta: quantityAfter - quantityBefore,
    reason,
  } as Record<string, unknown>,
  state: 'pending',
})

export const buildReceiveSyncEvent = (
  productId: string,
  quantity: number,
  supplier: string | undefined,
  ctx: StockSyncEventContext,
): SyncEvent => ({
  id: asSyncEventId(uuidv4()),
  idempotencyKey: asIdempotencyKey(`inventory.received:${productId}:${ctx.clientSequence}`),
  businessId: asBusinessId(ctx.businessId),
  entityKind: 'product',
  entityId: asProductId(productId),
  operation: 'update',
  originatingDeviceId: asDeviceId(ctx.originatingDeviceId),
  originatingEmployeeId: asEmployeeId(ctx.originatingEmployeeId),
  clientSequence: ctx.clientSequence,
  clientCreatedAt: new Date().toISOString(),
  entityVersion: Date.now(),
  payload: {
    id: productId,
    quantity_delta: quantity,
    reason: supplier ?? 'restock',
    event: 'inventory.received',
  } as Record<string, unknown>,
  state: 'pending',
})

export const buildTransferSyncEvent = (
  productId: string,
  quantity: number,
  fromBusinessId: string,
  toBusinessId: string,
  ctx: StockSyncEventContext,
): SyncEvent => ({
  id: asSyncEventId(uuidv4()),
  idempotencyKey: asIdempotencyKey(`inventory.transferred:${productId}:${ctx.clientSequence}`),
  businessId: asBusinessId(ctx.businessId),
  entityKind: 'product',
  entityId: asProductId(productId),
  operation: 'update',
  originatingDeviceId: asDeviceId(ctx.originatingDeviceId),
  originatingEmployeeId: asEmployeeId(ctx.originatingEmployeeId),
  clientSequence: ctx.clientSequence,
  clientCreatedAt: new Date().toISOString(),
  entityVersion: Date.now(),
  payload: {
    id: productId,
    quantity_delta: quantity,
    from_business_id: fromBusinessId,
    to_business_id: toBusinessId,
    event: 'inventory.transferred',
  } as Record<string, unknown>,
  state: 'pending',
})

export const buildCountSyncEvent = (
  productId: string,
  countedQuantity: number,
  previousQuantity: number,
  ctx: StockSyncEventContext,
): SyncEvent => ({
  id: asSyncEventId(uuidv4()),
  idempotencyKey: asIdempotencyKey(`inventory.counted:${productId}:${ctx.clientSequence}`),
  businessId: asBusinessId(ctx.businessId),
  entityKind: 'product',
  entityId: asProductId(productId),
  operation: 'update',
  originatingDeviceId: asDeviceId(ctx.originatingDeviceId),
  originatingEmployeeId: asEmployeeId(ctx.originatingEmployeeId),
  clientSequence: ctx.clientSequence,
  clientCreatedAt: new Date().toISOString(),
  entityVersion: Date.now(),
  payload: {
    id: productId,
    counted_quantity: countedQuantity,
    previous_quantity: previousQuantity,
    variance: countedQuantity - previousQuantity,
    event: 'inventory.counted',
  } as Record<string, unknown>,
  state: 'pending',
})

// ── Sale Void ──────────────────────────────────────────────────────────────────

export interface VoidSyncEventContext {
  businessId: BusinessId
  originatingDeviceId: DeviceId
  originatingEmployeeId: EmployeeId
  clientSequence: number
  reason: string
}

export const buildVoidSyncEvent = (
  sale: Sale,
  ctx: VoidSyncEventContext,
): SyncEvent => ({
  id: asSyncEventId(uuidv4()),
  idempotencyKey: asIdempotencyKey(`sale.voided:${sale.id}`),
  businessId: asBusinessId(ctx.businessId),
  entityKind: 'sale',
  entityId: asSaleId(sale.id),
  operation: 'update',
  originatingDeviceId: asDeviceId(ctx.originatingDeviceId),
  originatingEmployeeId: asEmployeeId(ctx.originatingEmployeeId),
  clientSequence: ctx.clientSequence,
  clientCreatedAt: new Date().toISOString(),
  entityVersion: (sale.version ?? 0) + 1,
  payload: {
    ...(sale as unknown as Record<string, unknown>),
    voidReason: ctx.reason,
    event: 'sale.voided',
  } as Record<string, unknown>,
  state: 'pending',
})

// ── Sale Refund ─────────────────────────────────────────────────────────────────

export interface RefundSyncEventContext {
  businessId: BusinessId
  originatingDeviceId: DeviceId
  originatingEmployeeId: EmployeeId
  clientSequence: number
  reason: string
  refundAmount: number
  isPartial: boolean
}

export const buildRefundSyncEvent = (
  sale: Sale,
  ctx: RefundSyncEventContext,
): SyncEvent => ({
  id: asSyncEventId(uuidv4()),
  idempotencyKey: asIdempotencyKey(`sale.refunded:${sale.id}`),
  businessId: asBusinessId(ctx.businessId),
  entityKind: 'sale',
  entityId: asSaleId(sale.id),
  operation: 'update',
  originatingDeviceId: asDeviceId(ctx.originatingDeviceId),
  originatingEmployeeId: asEmployeeId(ctx.originatingEmployeeId),
  clientSequence: ctx.clientSequence,
  clientCreatedAt: new Date().toISOString(),
  entityVersion: (sale.version ?? 0) + 1,
  payload: {
    ...(sale as unknown as Record<string, unknown>),
    refundReason: ctx.reason,
    refundAmount: ctx.refundAmount,
    isPartialRefund: ctx.isPartial,
    event: 'sale.refunded',
  } as Record<string, unknown>,
  state: 'pending',
})

// ── Debt (Phase 11) ────────────────────────────────────────────────────────────

export interface DebtSyncEventContext {
  businessId: BusinessId
  originatingDeviceId: DeviceId
  originatingEmployeeId: EmployeeId
  clientSequence: number
}

export const buildDebtSyncEvent = (
  operation: 'create' | 'update' | 'delete' | 'tombstone',
  debt: Debt,
  ctx: DebtSyncEventContext,
): SyncEvent => ({
  id: asSyncEventId(uuidv4()),
  idempotencyKey: asIdempotencyKey(`${operation}:debt:${debt.id}`),
  businessId: asBusinessId(ctx.businessId),
  entityKind: 'debt',
  entityId: debt.id,
  operation,
  originatingDeviceId: asDeviceId(ctx.originatingDeviceId),
  originatingEmployeeId: asEmployeeId(ctx.originatingEmployeeId),
  clientSequence: ctx.clientSequence,
  clientCreatedAt: new Date().toISOString(),
  entityVersion: debt.version,
  payload: debt as unknown as Record<string, unknown>,
  state: 'pending',
})

// ── DebtPayment (Phase 11) ─────────────────────────────────────────────────────

export interface DebtPaymentSyncEventContext {
  businessId: BusinessId
  originatingDeviceId: DeviceId
  originatingEmployeeId: EmployeeId
  clientSequence: number
}

export const buildDebtPaymentSyncEvent = (
  payment: DebtPayment,
  ctx: DebtPaymentSyncEventContext,
): SyncEvent => ({
  id: asSyncEventId(uuidv4()),
  idempotencyKey: asIdempotencyKey(`debtPayment:created:${payment.id}`),
  businessId: asBusinessId(ctx.businessId),
  entityKind: 'debtPayment',
  entityId: payment.id,
  operation: 'create',
  originatingDeviceId: asDeviceId(ctx.originatingDeviceId),
  originatingEmployeeId: asEmployeeId(ctx.originatingEmployeeId),
  clientSequence: ctx.clientSequence,
  clientCreatedAt: new Date().toISOString(),
  entityVersion: payment.version,
  payload: payment as unknown as Record<string, unknown>,
  state: 'pending',
})

// ── Expense (Phase 12) ───────────────────────────────────────────────────────

export interface ExpenseSyncEventContext {
  businessId: BusinessId
  originatingDeviceId: DeviceId
  originatingEmployeeId: EmployeeId
  clientSequence: number
}

export const buildExpenseSyncEvent = (
  operation: 'create' | 'update',
  expense: Expense,
  ctx: ExpenseSyncEventContext,
): SyncEvent => ({
  id: asSyncEventId(uuidv4()),
  idempotencyKey: asIdempotencyKey(`${operation}:expense:${expense.id}`),
  businessId: asBusinessId(ctx.businessId),
  entityKind: 'expense',
  entityId: asExpenseId(expense.id),
  operation,
  originatingDeviceId: asDeviceId(ctx.originatingDeviceId),
  originatingEmployeeId: asEmployeeId(ctx.originatingEmployeeId),
  clientSequence: ctx.clientSequence,
  clientCreatedAt: new Date().toISOString(),
  entityVersion: expense.version,
  payload: expense as unknown as Record<string, unknown>,
  state: 'pending',
})
