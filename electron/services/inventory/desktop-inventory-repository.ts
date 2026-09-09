/**
 * desktop-inventory-repository.ts — InventoryRepository entry point.
 * Split per ANPAS: mappers → inventory-mappers.ts.
 */

import type { UUID, ISO8601 } from '@soostori/core'
import type { InventoryRepository, StockMovement, StockBalance, StockSummary, StockReservation } from '@soostori/inventory'
import { getDatabase } from '../../database'
import { rowToMovement, rowToBalance } from './inventory-mappers'

interface MovementRow {
  id: string; shop_id: string; product_id: string; device_id: string
  user_id: string; event_type: string; quantity: number
  balance_after: number; status: string; payload: string
  sequence_number: number; idempotency_key: string | null; created_at: string
}

export class DesktopInventoryRepository implements InventoryRepository {
  private readonly db = getDatabase()

  async getMovement(id: UUID): Promise<StockMovement | null> {
    const row = this.db.prepare('SELECT * FROM inventory_transactions WHERE id = ?').get(id as string) as MovementRow | undefined
    return row ? rowToMovement(row) : null
  }

  async listMovements(filter?: Parameters<InventoryRepository['listMovements']>[0], pagination?: Parameters<InventoryRepository['listMovements']>[1]): Promise<StockMovement[]> {
    const conditions: string[] = []
    const params: unknown[] = []
    if (filter?.productId) { conditions.push('product_id = ?'); params.push(filter.productId as string) }
    if (filter?.type) { conditions.push('event_type = ?'); params.push(filter.type) }
    if (filter?.actorId) { conditions.push('user_id = ?'); params.push(filter.actorId as string) }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const limit = pagination?.limit ?? 100
    const offset = pagination?.offset ?? 0
    const rows = this.db.prepare(
      `SELECT * FROM inventory_transactions ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    ).all(...params, limit, offset) as MovementRow[]
    return rows.map(rowToMovement)
  }

  async appendMovement(movement: StockMovement): Promise<void> {
    const now = new Date().toISOString()
    if (movement.idempotencyKey) {
      const existing = this.db.prepare('SELECT id FROM inventory_transactions WHERE idempotency_key = ?').get(movement.idempotencyKey as string)
      if (existing) return
    }
    this.db.prepare(`
      INSERT INTO inventory_transactions
        (id, shop_id, product_id, device_id, user_id, event_type, quantity, balance_after, status, payload, sequence_number, idempotency_key, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      movement.id as string, movement.shopId as string, movement.productId as string,
      movement.deviceId as string, movement.actorId ?? '', movement.type,
      movement.quantity, movement.balanceAfter, 'confirmed', JSON.stringify(movement),
      0, movement.idempotencyKey ?? null, now,
    )
    // Keep products.current_stock in sync with the ledger
    this.db.prepare('UPDATE products SET current_stock = ?, updated_at = ? WHERE id = ?')
      .run(movement.balanceAfter, now, movement.productId as string)
  }

  async hasMovementByKey(idempotencyKey: UUID): Promise<boolean> {
    const row = this.db.prepare('SELECT id FROM inventory_transactions WHERE idempotency_key = ?').get(idempotencyKey as string)
    return Boolean(row)
  }

  async getLatestMovement(productId: UUID): Promise<StockMovement | null> {
    const row = this.db.prepare(`SELECT * FROM inventory_transactions WHERE product_id = ? ORDER BY sequence_number DESC LIMIT 1`).get(productId as string) as MovementRow | undefined
    return row ? rowToMovement(row) : null
  }

  async getStockSummary(shopId: UUID, productId: UUID): Promise<StockSummary | null> {
    const balance = await this.getBalance(productId)
    if (!balance) return null
    return { productId, productName: '', shopId, currentQuantity: balance.quantity, totalReceived: 0, totalSold: 0, totalAdjusted: 0, totalTransferred: 0, lastMovementAt: null }
  }

  async getBalance(productId: UUID): Promise<StockBalance | null> {
    const row = this.db.prepare('SELECT current_stock, shop_id FROM products WHERE id = ?').get(productId as string) as { current_stock: number; shop_id: string } | undefined
    return row ? rowToBalance(row, productId) : null
  }

  async upsertBalance(balance: StockBalance): Promise<void> {
    this.db.prepare('UPDATE products SET current_stock = ?, updated_at = ? WHERE id = ?').run(balance.quantity, balance.updatedAt, balance.productId as string)
  }

  // Desktop does not maintain reservations (Phase 10 wire has no reservation events)
  async createReservation(_reservation: StockReservation): Promise<void> { void _reservation }
  async getReservation(_id: UUID): Promise<StockReservation | null> { return null }
  async getReservationsBySale(_saleId: UUID): Promise<StockReservation[]> { return [] }
  async updateReservationStatus(_id: UUID, _status: StockReservation['status']): Promise<void> { void _id; void _status }
  async getActiveReservations(_productId: UUID): Promise<StockReservation[]> { return [] }
}
