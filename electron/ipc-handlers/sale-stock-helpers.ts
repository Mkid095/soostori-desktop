/**
 * Shared stock-processing helpers used by sale-create and sale-refund handlers.
 * All stock mutations go through current_stock (cached speed layer).
 * Deferred: Primary Device stock authorization to be wired in Phase 9.2.3 sync step.
 */

import type { Database } from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import { getMainWindow } from '../window-manager'

interface ProductStockRow { name: string; stock: number; track_inventory: number | null; low_stock_threshold: number | null }

export interface SaleStockDelta {
  productId: string
  quantity: number       // positive = decrement on sale, increment on refund
  productName: string
}

/** Decrement stock for a single sale item. Writes stock_movements + inventory_transactions. */
export function applySaleStockDeduction(
  db: Database,
  delta: SaleStockDelta,
  saleId: string,
  shopId: string,
  deviceId: string | null,
  userId: string,
  now: string,
): string[] {
  const invTxIds: string[] = []
  const product = db.prepare(
    'SELECT name, COALESCE(current_stock, stock_quantity) as stock, track_inventory, low_stock_threshold FROM products WHERE id = ?'
  ).get(delta.productId) as ProductStockRow | undefined
  if (!product) return invTxIds

  const newStock = product.stock - delta.quantity
  db.prepare('UPDATE products SET current_stock = ?, stock_quantity = ?, updated_at = ? WHERE id = ?')
    .run(newStock, newStock, now, delta.productId)

  db.prepare(`INSERT INTO stock_movements (id, product_id, type, quantity, balance_after, reason, reference_id, created_at)
    VALUES (?, ?, 'sale', ?, ?, ?, ?, ?)`)
    .run(uuidv4(), delta.productId, -delta.quantity, newStock, 'Sale', saleId, now)

  const invTxId = uuidv4()
  invTxIds.push(invTxId)
  db.prepare(`
    INSERT INTO inventory_transactions (id, shop_id, product_id, device_id, user_id, event_type, quantity, balance_after, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'sale', ?, ?, 'confirmed', ?)
  `).run(invTxId, shopId, delta.productId, deviceId, userId, -delta.quantity, newStock, now)

  if (product.track_inventory && product.low_stock_threshold != null) {
    if (newStock <= (product.low_stock_threshold || 0) && newStock >= 0) {
      getMainWindow()?.webContents.send('notification:low-stock', { productName: product.name, stock: newStock })
    }
  }
  return invTxIds
}

/** Increment stock for a single refund item. Writes stock_movements + inventory_transactions. */
export function applyRefundStockReturn(
  db: Database,
  delta: SaleStockDelta,
  saleId: string,
  shopId: string,
  deviceId: string | null,
  userId: string,
  now: string,
): void {
  const product = db.prepare(
    'SELECT name, COALESCE(current_stock, stock_quantity) as stock, track_inventory, low_stock_threshold FROM products WHERE id = ?'
  ).get(delta.productId) as ProductStockRow | undefined
  if (!product) return

  const newStock = product.stock + delta.quantity
  db.prepare('UPDATE products SET current_stock = ?, stock_quantity = ?, updated_at = ? WHERE id = ?')
    .run(newStock, newStock, now, delta.productId)

  db.prepare(`INSERT INTO stock_movements (id, product_id, type, quantity, balance_after, reason, reference_id, created_at)
    VALUES (?, ?, 'refund', ?, ?, ?, ?, ?)`)
    .run(uuidv4(), delta.productId, delta.quantity, newStock, 'Refund', saleId, now)

  db.prepare(`
    INSERT INTO inventory_transactions (id, shop_id, product_id, device_id, user_id, event_type, quantity, balance_after, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'refund', ?, ?, 'confirmed', ?)
  `).run(uuidv4(), shopId, delta.productId, deviceId, userId, delta.quantity, newStock, now)
}
