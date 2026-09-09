/**
 * inventory-mappers.ts — Row → domain type mappers for DesktopInventoryRepository.
 * Part of desktop-inventory-repository split per ANPAS.
 */

import type { UUID, ISO8601 } from '@soostori/core'
import type { StockMovement, StockBalance, StockSummary, StockMovementType } from '@soostori/inventory'

interface MovementRow {
  id: string; shop_id: string; product_id: string; device_id: string
  user_id: string; event_type: string; quantity: number
  balance_after: number; status: string; payload: string
  sequence_number: number; idempotency_key: string | null; created_at: string
}

export function rowToMovement(row: MovementRow): StockMovement {
  return {
    id: row.id as UUID, shopId: row.shop_id as UUID, productId: row.product_id as UUID,
    productVariantId: null, type: normalizeType(row.event_type), quantity: row.quantity,
    balanceAfter: row.balance_after, referenceId: null, referenceType: null, reason: null,
    actorType: 'system', actorId: row.user_id as UUID | null, deviceId: row.device_id as UUID,
    timestamp: row.created_at as ISO8601, sequence: row.sequence_number,
    idempotencyKey: (row.idempotency_key ?? row.id) as UUID, syncedAt: null,
  }
}

export function normalizeType(raw: string): StockMovementType {
  const allowed: StockMovementType[] = ['received', 'sold', 'refunded', 'returned', 'adjusted', 'transferred', 'reserved', 'released']
  if ((allowed as string[]).includes(raw)) return raw as StockMovementType
  return 'adjusted'
}

export function rowToBalance(row: { current_stock: number; shop_id: string }, productId: UUID): StockBalance {
  return {
    productId, shopId: row.shop_id as UUID, productVariantId: null,
    quantity: row.current_stock, reservedQuantity: 0, lastSequence: 0,
    updatedAt: new Date().toISOString() as ISO8601,
  }
}
