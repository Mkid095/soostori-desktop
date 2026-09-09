/**
 * inventory-repository.ts — Singleton accessor for DesktopInventoryRepository.
 *
 * Wires @soostori/inventory InventoryRepository to Desktop SQLite.
 * Exposes the same repository used by inventory-orchestrator so sync
 * applies the same movements as local sales.
 */

import { asShopId, asDeviceId, type UUID } from '@soostori/core'
import { StockMovementLedger } from '@soostori/inventory'
import { DesktopInventoryRepository } from './inventory/desktop-inventory-repository'
import { getShopId, getDeviceId } from './cloud-auth'

let _repo: DesktopInventoryRepository | null = null
let _ledger: StockMovementLedger | null = null

export function getInventoryRepository(): DesktopInventoryRepository {
  if (_repo) return _repo
  _repo = new DesktopInventoryRepository()
  return _repo
}

/** Returns a StockMovementLedger backed by DesktopInventoryRepository. */
export function getInventoryLedger(): StockMovementLedger {
  if (_ledger) return _ledger
  const shopId = asShopId(getShopId() || 'local')
  const deviceId = asDeviceId(getDeviceId() || 'desktop')
  _ledger = new StockMovementLedger(getInventoryRepository(), shopId, deviceId)
  return _ledger
}
