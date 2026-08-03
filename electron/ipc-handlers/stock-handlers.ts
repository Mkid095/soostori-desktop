import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'
import { stockAdjustmentSchema } from './validation'

interface ProductStockRow {
  stock_quantity: number | null
}

export function registerStockHandlers(): void {
  ipcMain.handle('db:inventory:adjust', (_event, rawProductId: unknown, rawQuantityChange: unknown, rawReason: unknown) => {
    const validated = stockAdjustmentSchema.parse({
      productId: rawProductId,
      quantityChange: rawQuantityChange,
      reason: rawReason,
    })
    const db = getDatabase()
    const id = uuidv4()
    const now = new Date().toISOString()

    const product = db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(validated.productId) as ProductStockRow | undefined
    if (!product) throw new Error('Product not found')

    const newQuantity = (product.stock_quantity || 0) + validated.quantityChange
    if (newQuantity < 0) throw new Error('Insufficient stock')

    db.prepare('UPDATE products SET stock_quantity = ?, updated_at = ? WHERE id = ?').run(newQuantity, now, validated.productId)

    db.prepare(`
      INSERT INTO stock_movements (id, product_id, type, quantity, balance_after, reason, created_at)
      VALUES (?, ?, 'adjustment', ?, ?, ?, ?)
    `).run(id, validated.productId, validated.quantityChange, newQuantity, validated.reason, now)

    const adjustmentLogId = uuidv4()
    db.prepare(`
      INSERT INTO stock_adjustment_log (id, product_id, quantity_before, quantity_after, quantity_change, reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(adjustmentLogId, validated.productId, product.stock_quantity, newQuantity, validated.quantityChange, validated.reason, now)

    return {
      productId: validated.productId,
      previousQuantity: product.stock_quantity || 0,
      newQuantity,
      quantityChange: validated.quantityChange,
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
