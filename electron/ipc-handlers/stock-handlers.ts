/**
 * Stock IPC handlers — manual stock adjustments.
 *
 * All stock mutations now flow through the SDK canonical path:
 *   db:inventory:adjust → adjustStock() → StockMovementLedger
 *     → Primary authorization check (ONLINE required)
 *     → inventory_transactions ledger
 *     → products.current_stock cache update
 *
 * Legacy: stock_movements table is retired from new production writes.
 * Kept for historical reads only.
 */

import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import log from 'electron-log'
import { stockAdjustmentSchema } from './validation'
import { adjustStock } from '../sdk/inventory-orchestrator'
import { desktopLoadSession } from '../auth/electron-store-session'

export function registerStockHandlers(): void {
  ipcMain.handle('db:inventory:adjust', async (_event, rawProductId: unknown, rawQuantityChange: unknown, rawReason: unknown) => {
    const validated = stockAdjustmentSchema.parse({
      productId: rawProductId,
      quantityChange: rawQuantityChange,
      reason: rawReason,
    })

    // Get current user from session
    const session = await desktopLoadSession()
    const userId = session?.userId ?? 'system'

    // Run through SDK orchestrator with Primary authorization
    const result = await adjustStock({
      productId: validated.productId,
      quantity: validated.quantityChange,
      reason: validated.reason,
      userId,
    })

    return {
      productId: validated.productId,
      previousQuantity: result.previousQuantity,
      newQuantity: result.newQuantity,
      quantityChange: result.quantityChange,
      reason: validated.reason,
    }
  })

  ipcMain.handle('db:inventory:movements', (_event, productId?: string, limit: number = 100) => {
    const db = getDatabase()
    if (productId) {
      return db.prepare(`
        SELECT sm.*, p.name as product_name
        FROM stock_movements sm
        JOIN products p ON sm.product_id = p.id
        WHERE sm.product_id = ?
        ORDER BY sm.created_at DESC
        LIMIT ?
      `).all(productId, limit)
    }
    return db.prepare(`
      SELECT sm.*, p.name as product_name
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      ORDER BY sm.created_at DESC
      LIMIT ?
    `).all(limit)
  })

  log.info('Stock IPC handlers registered')
}
