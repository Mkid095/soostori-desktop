/**
 * SDK Sale Orchestrator — wires Desktop sale path to canonical SDK business logic.
 * This is the ONLY place Desktop connects to SDK services for stock-sensitive operations.
 *
 * Phase 11.2: Primary Device authorization now flows through a single canonical
 * @soostori/devices.PrimaryDeviceCoordinator instance. The previous duplicate
 * getPrimaryStatus() inline in this file has been removed — see
 * electron/sdk/primary-coordinator.ts.
 */

import { asShopId, asDeviceId, newId, type UUID, type Money } from '@soostori/core'
import { DesktopSalesRepository } from '@soostori/desktop-adapter'
import { SalesService } from '@soostori/sales'
import type { SaleRequest, SaleResponse, PaymentMethod } from '@soostori/sales'
import { ProductsRepository } from '@soostori/desktop-adapter'
import type { ProductRepository } from '@soostori/products'
import { getDatabase } from '../database'
import log from 'electron-log'
import { getPrimaryStatus, initPrimaryCoordinator, tickPrimaryCoordinator } from './primary-coordinator'
import type { CommitSaleArgs, AuthorizeSaleArgs } from './sale-orchestrator-types'

export type { SaleRequest, SaleResponse }
export type { CommitSaleArgs, AuthorizeSaleArgs }

// ── Singleton ──────────────────────────────────────────────────────────────

let _svc: SalesService | null = null
let _shopId = ''
let _deviceId = ''

export function initSaleOrchestrator(opts: { shopId: string; deviceId: string }): void {
  _shopId = opts.shopId
  _deviceId = opts.deviceId

  initPrimaryCoordinator({ shopId: _shopId, deviceId: _deviceId })
  tickPrimaryCoordinator()

  // Set shop context for row mappers before any repository query runs
  ProductsRepository.setSaleMeta({ shopId: _shopId, deviceId: _deviceId })

  const salesRepo = new DesktopSalesRepository()
  // desktop-adapter's ProductsRepository has a narrower findMany filter
  // signature than @soostori/products.ProductRepository. The cast is
  // safe because SalesService only forwards supported filter fields.
  const productsRepo = new ProductsRepository() as unknown as ProductRepository

  _svc = new SalesService(salesRepo, productsRepo as never, asShopId(_shopId), asDeviceId(_deviceId), checkPrimary)

  log.info(`SaleOrchestrator: initialized for shop=${_shopId} device=${_deviceId}`)
}

// Phase 11.2: re-export the canonical accessor for legacy callers.
export { getPrimaryStatus }

function checkPrimary(): void {
  if (!_svc) throw new Error('SaleOrchestrator: not initialized')
  tickPrimaryCoordinator()
  const { canAuthorStockOps, status } = getPrimaryStatus()
  if (!canAuthorStockOps) {
    throw Object.assign(
      new Error(`Stock mutation blocked: Primary Device is ${status}`),
      { code: 'STOCK_AUTHORIZATION_ERROR', status },
    )
  }
}

// ── Commit (host / offline) ─────────────────────────────────────────────

export async function commitSale(args: CommitSaleArgs): Promise<{ saleId: string }> {
  checkPrimary()

  // Wire sale meta into ProductsRepository so ledger entry is written
  ProductsRepository.setSaleMeta({
    saleId: args.saleId,
    userId: args.userId,
    deviceId: args.deviceId,
    shopId: _shopId,
  })

  return _svc!.commit({
    saleId: args.saleId as UUID,
    items: args.items.map(i => ({
      productId: i.productId as UUID,
      productName: i.productName,
      quantity: i.quantity,
      unitPrice: i.unitPrice as Money,
      discount: i.discount,
      totalPrice: i.totalPrice as Money,
      variationName: i.variationName,
    })),
    paymentMethod: args.paymentMethod,
    paidAmount: args.paidAmount as Money,
    discountAmount: args.discountAmount,
    taxAmount: args.taxAmount,
    note: args.note ?? null,
    customerId: args.customerId ? (args.customerId as UUID) : null,
    customerName: args.customerName ?? null,
    deviceId: args.deviceId as UUID,
    userId: args.userId as UUID,
  })
}

// ── Authorize (client → host) ──────────────────────────────────────────

/** Client → host: Primary Device authorization only. Does NOT write the sale. */
export async function authorizeSale(args: AuthorizeSaleArgs): Promise<SaleResponse> {
  checkPrimary()

  const request: SaleRequest = {
    idempotencyKey: newId() as UUID,
    shopId: asShopId(_shopId),
    items: args.items.map(i => ({
      productId: i.productId as UUID,
      quantity: i.quantity,
    })),
    paymentMethod: args.paymentMethod,
    paidAmount: args.paidAmount as Money,
    customerId: args.customerId ? (args.customerId as UUID) : null,
    customerName: args.customerName ?? null,
    note: args.note ?? null,
    deviceId: args.deviceId as UUID,
    userId: args.userId as UUID,
  }

  return _svc!.authorize(request)
}
