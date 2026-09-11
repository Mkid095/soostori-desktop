/**
 * SDK Inventory Orchestrator — wires Desktop inventory operations to canonical SDK.
 *
 * Stock adjustment is stock-sensitive and obeys Primary Device authorization.
 * All adjustments go through StockMovementLedger → inventory_transactions.
 *
 * Phase 11.2: Primary status flows through the canonical @soostori/devices
 * coordinator (electron/sdk/primary-coordinator.ts) — duplicated inline
 * getPrimaryStatus has been removed.
 */

import { asShopId, asDeviceId, newId, type UUID } from '@soostori/core'
import { DesktopInventoryRepository, ProductsRepository } from '@soostori/desktop-adapter'
import { StockMovementLedger } from '@soostori/inventory'
import log from 'electron-log'
import { getPrimaryStatus, initPrimaryCoordinator, tickPrimaryCoordinator } from './primary-coordinator'

export { StockMovementLedger }

// ── Singleton ──────────────────────────────────────────────────────────────

let _ledger: StockMovementLedger | null = null
let _shopId = ''
let _deviceId = ''

export function initInventoryOrchestrator(opts: { shopId: string; deviceId: string }): void {
  _shopId = opts.shopId
  _deviceId = opts.deviceId
  initPrimaryCoordinator({ shopId: _shopId, deviceId: _deviceId })
  tickPrimaryCoordinator()
  const repo = new DesktopInventoryRepository()
  _ledger = new StockMovementLedger(repo, asShopId(_shopId), asDeviceId(_deviceId))
  log.info(`InventoryOrchestrator: initialized for shop=${_shopId}`)
}

// Phase 11.2: re-export the canonical accessor for legacy callers.
export { getPrimaryStatus }

function checkPrimary(): void {
  if (!_ledger) throw new Error('InventoryOrchestrator: not initialized')
  tickPrimaryCoordinator()
  const { canAuthorStockOps, status } = getPrimaryStatus()
  if (!canAuthorStockOps) {
    throw Object.assign(
      new Error(`Stock mutation blocked: Primary Device is ${status}`),
      { code: 'STOCK_AUTHORIZATION_ERROR', status },
    )
  }
}

// ── Stock adjustment ─────────────────────────────────────────────────────

export async function adjustStock(args: {
  productId: string
  quantity: number  // signed delta (+add, -remove)
  reason: string
  userId: string
}): Promise<{ productId: string; previousQuantity: number; newQuantity: number; quantityChange: number }> {
  checkPrimary()
  if (!_ledger) throw new Error('InventoryOrchestrator: not initialized')

  const movement = await _ledger.apply({
    productId: args.productId as UUID,
    type: 'adjusted',
    quantity: args.quantity,
    reason: args.reason,
    actorType: 'employee',
    actorId: args.userId as UUID,
    idempotencyKey: newId() as UUID,
  })

  return {
    productId: args.productId,
    previousQuantity: movement.balanceAfter - movement.quantity,
    newQuantity: movement.balanceAfter,
    quantityChange: movement.quantity,
  }
}

// ── Stock receive ─────────────────────────────────────────────────────────

export async function receiveStock(args: {
  productId: string
  quantity: number  // positive
  supplier?: string
  notes?: string
  userId: string
}): Promise<{ productId: string; previousQuantity: number; newQuantity: number; quantityChange: number }> {
  checkPrimary()
  if (!_ledger) throw new Error('InventoryOrchestrator: not initialized')
  if (args.quantity <= 0) throw new Error('Receive quantity must be positive')

  const movement = await _ledger.apply({
    productId: args.productId as UUID,
    type: 'received',
    quantity: args.quantity,
    reason: args.supplier ?? 'restock',
    actorType: 'employee',
    actorId: args.userId as UUID,
    idempotencyKey: newId() as UUID,
  })

  return {
    productId: args.productId,
    previousQuantity: movement.balanceAfter - movement.quantity,
    newQuantity: movement.balanceAfter,
    quantityChange: movement.quantity,
  }
}

// ── Stock transfer ────────────────────────────────────────────────────────

export async function transferStock(args: {
  productId: string
  fromBusinessId: string
  toBusinessId: string
  quantity: number  // positive
  userId: string
}): Promise<{
  fromMovement: { productId: string; previousQuantity: number; newQuantity: number; quantityChange: number }
  toMovement: { productId: string; previousQuantity: number; newQuantity: number; quantityChange: number }
}> {
  checkPrimary()
  if (!_ledger) throw new Error('InventoryOrchestrator: not initialized')
  if (args.quantity <= 0) throw new Error('Transfer quantity must be positive')

  const transferId = newId()
  const fromMovement = await _ledger.apply({
    productId: args.productId as UUID,
    type: 'transferred',
    quantity: -args.quantity,
    referenceId: transferId,
    referenceType: 'transfer',
    reason: `transfer_out:${args.toBusinessId}`,
    actorType: 'employee',
    actorId: args.userId as UUID,
    idempotencyKey: newId() as UUID,
  })

  const toMovement = await _ledger.apply({
    productId: args.productId as UUID,
    type: 'transferred',
    quantity: args.quantity,
    referenceId: transferId,
    referenceType: 'transfer',
    reason: `transfer_in:${args.fromBusinessId}`,
    actorType: 'employee',
    actorId: args.userId as UUID,
    idempotencyKey: newId() as UUID,
  })

  return {
    fromMovement: {
      productId: args.productId,
      previousQuantity: fromMovement.balanceAfter - fromMovement.quantity,
      newQuantity: fromMovement.balanceAfter,
      quantityChange: fromMovement.quantity,
    },
    toMovement: {
      productId: args.productId,
      previousQuantity: toMovement.balanceAfter - toMovement.quantity,
      newQuantity: toMovement.balanceAfter,
      quantityChange: toMovement.quantity,
    },
  }
}

// ── Stock count ───────────────────────────────────────────────────────────

export async function countStock(args: {
  productId: string
  countedQuantity: number
  userId: string
}): Promise<{ productId: string; previousQuantity: number; newQuantity: number; variance: number }> {
  checkPrimary()
  if (!_ledger) throw new Error('InventoryOrchestrator: not initialized')

  const previousQuantity = await _ledger.getQuantity(args.productId as UUID)
  const variance = args.countedQuantity - previousQuantity
  if (variance === 0) {
    return { productId: args.productId, previousQuantity, newQuantity: previousQuantity, variance: 0 }
  }

  const movement = await _ledger.apply({
    productId: args.productId as UUID,
    type: 'adjusted',
    quantity: variance,
    reason: 'stock_count',
    actorType: 'employee',
    actorId: args.userId as UUID,
    idempotencyKey: newId() as UUID,
  })

  return {
    productId: args.productId,
    previousQuantity,
    newQuantity: movement.balanceAfter,
    variance,
  }
}
