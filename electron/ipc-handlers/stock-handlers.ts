/**
 * Stock IPC handlers — manual stock adjustments, receives, transfers, counts.
 *
 * All stock mutations flow through the SDK canonical path:
 *   db:inventory:adjust  → adjustStock()
 *   db:inventory:receive  → receiveStock()
 *   db:inventory:transfer → transferStock()
 *   db:inventory:count    → countStock()
 *     → Primary authorization check (ONLINE required)
 *     → StockMovementLedger → inventory_transactions ledger
 *     → products.current_stock cache update
 *     → Phase 08-09: sync events via RealSyncEngine.enqueue()
 *     → Phase 08: low-stock notification dispatch when threshold breached
 *
 * Phase 04: capability enforcement — inventory.adjust / inventory.receive required.
 * Phase 08: stock.adjusted sync event via RealSyncEngine
 * Phase 09: stock.received, stock.transferred, stock.counted sync events
 */

import { ipcMain, BrowserWindow } from 'electron'
import { getDatabase } from '../database'
import log from 'electron-log'
import {
  receiveStockSchema,
  transferStockSchema,
  countStockSchema,
  countBatchSchema,
  stockAdjustmentSchema,
} from './validation'
import { adjustStock, receiveStock, transferStock, countStock } from '../sdk/inventory-orchestrator'
import { desktopLoadSession } from '../auth/electron-store-session'
import { can, CAPABILITIES } from '@soostori/auth'
import type { Member } from '@soostori/auth'
import type { EmployeeRole } from '@soostori/core'
import { getRealSyncEngine } from '../sync/sync-engine'
import {
  buildStockSyncEvent,
  buildReceiveSyncEvent,
  buildTransferSyncEvent,
  buildCountSyncEvent,
  type StockSyncEventContext,
} from '../database/sync-event-builder'
import { asBusinessId, asDeviceId, asEmployeeId } from '@soostori/core'
import { audit } from '../services/audit-logger'

function getCallerMember(session: { employeeId: string }): Member {
  const db = getDatabase()
  const row = db.prepare('SELECT role FROM employees WHERE id = ?').get(session.employeeId) as { role: string } | undefined
  return { role: (row?.role ?? 'cashier') as EmployeeRole }
}

function buildSyncCtx(session: { shopId?: string; deviceId?: string; employeeId?: string }): StockSyncEventContext {
  return {
    businessId: asBusinessId(session?.shopId ?? ''),
    originatingDeviceId: asDeviceId(session?.deviceId ?? 'desktop'),
    originatingEmployeeId: asEmployeeId(session?.employeeId ?? ''),
    clientSequence: Date.now(),
  }
}

function dispatchLowStockAlert(productId: string): void {
  const db = getDatabase()
  const product = db.prepare(
    'SELECT name, current_stock, low_stock_threshold, track_inventory FROM products WHERE id = ?'
  ).get(productId) as { name: string; current_stock: number; low_stock_threshold: number; track_inventory: number } | undefined
  if (product && product.track_inventory && product.current_stock >= 0 &&
      product.current_stock <= product.low_stock_threshold) {
    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
      win.webContents.send('notification:low-stock', {
        productName: product.name,
        stock: product.current_stock,
      })
    }
  }
}

export function registerStockHandlers(): void {

  // ── Adjust Stock ────────────────────────────────────────────────────────
  ipcMain.handle('db:inventory:adjust', async (_event, rawProductId: unknown, rawQuantityChange: unknown, rawReason: unknown) => {
    const session = await desktopLoadSession()
    if (!session) throw new Error('Not authenticated')
    if (!can(getCallerMember(session), CAPABILITIES.INVENTORY_ADJUST)) {
      throw new Error('Insufficient permissions: inventory.adjust required')
    }

    const validated = stockAdjustmentSchema.parse({
      productId: rawProductId,
      quantityChange: rawQuantityChange,
      reason: rawReason,
    })

    const userId = session.userId ?? 'system'
    const result = await adjustStock({
      productId: validated.productId,
      quantity: validated.quantityChange,
      reason: validated.reason,
      userId,
    })

    const shopId = (session as { shopId?: string }).shopId ?? ''
    if (shopId) {
      const syncCtx = buildSyncCtx(session)
      const syncEvent = buildStockSyncEvent(
        validated.productId,
        result.previousQuantity,
        result.newQuantity,
        validated.reason,
        syncCtx,
      )
      getRealSyncEngine().enqueue(syncEvent).catch(() => {})
    }

    dispatchLowStockAlert(validated.productId)

    audit.stockAdjusted(validated.productId, shopId, session.employeeId, {
      previousQuantity: result.previousQuantity,
      newQuantity: result.newQuantity,
      change: result.quantityChange,
      reason: validated.reason,
    })

    return {
      productId: validated.productId,
      previousQuantity: result.previousQuantity,
      newQuantity: result.newQuantity,
      quantityChange: result.quantityChange,
      reason: validated.reason,
    }
  })

  // ── Receive Stock ───────────────────────────────────────────────────────
  ipcMain.handle('db:inventory:receive', async (_event, raw: unknown) => {
    const session = await desktopLoadSession()
    if (!session) throw new Error('Not authenticated')
    if (!can(getCallerMember(session), CAPABILITIES.INVENTORY_ADJUST)) {
      throw new Error('Insufficient permissions: inventory.adjust required')
    }

    const validated = receiveStockSchema.parse(raw)
    const userId = session.userId ?? 'system'

    const result = await receiveStock({
      productId: validated.productId,
      quantity: validated.quantity,
      supplier: validated.supplier,
      notes: validated.notes,
      userId,
    })

    const shopId = (session as { shopId?: string }).shopId ?? ''
    if (shopId) {
      const syncCtx = buildSyncCtx(session)
      const syncEvent = buildReceiveSyncEvent(
        validated.productId,
        result.quantityChange,
        validated.supplier,
        syncCtx,
      )
      getRealSyncEngine().enqueue(syncEvent).catch(() => {})
    }

    dispatchLowStockAlert(validated.productId)

    return {
      productId: validated.productId,
      previousQuantity: result.previousQuantity,
      newQuantity: result.newQuantity,
      quantityChange: result.quantityChange,
      supplier: validated.supplier,
    }
  })

  // ── Transfer Stock ─────────────────────────────────────────────────────
  ipcMain.handle('db:inventory:transfer', async (_event, raw: unknown) => {
    const session = await desktopLoadSession()
    if (!session) throw new Error('Not authenticated')
    if (!can(getCallerMember(session), CAPABILITIES.INVENTORY_TRANSFER)) {
      throw new Error('Insufficient permissions: inventory.transfer required')
    }

    const validated = transferStockSchema.parse(raw)
    const userId = session.userId ?? 'system'

    const result = await transferStock({
      productId: validated.productId,
      fromBusinessId: validated.fromBusinessId,
      toBusinessId: validated.toBusinessId,
      quantity: validated.quantity,
      userId,
    })

    const shopId = (session as { shopId?: string }).shopId ?? ''
    if (shopId) {
      const syncCtx = buildSyncCtx(session)
      const syncEvent = buildTransferSyncEvent(
        validated.productId,
        validated.quantity,
        validated.fromBusinessId,
        validated.toBusinessId,
        syncCtx,
      )
      getRealSyncEngine().enqueue(syncEvent).catch(() => {})
    }

    return {
      productId: validated.productId,
      fromBusinessId: validated.fromBusinessId,
      toBusinessId: validated.toBusinessId,
      quantity: validated.quantity,
      fromPreviousQuantity: result.fromMovement.previousQuantity,
      fromNewQuantity: result.fromMovement.newQuantity,
      toPreviousQuantity: result.toMovement.previousQuantity,
      toNewQuantity: result.toMovement.newQuantity,
    }
  })

  // ── Stock Count ─────────────────────────────────────────────────────────
  ipcMain.handle('db:inventory:count', async (_event, raw: unknown) => {
    const session = await desktopLoadSession()
    if (!session) throw new Error('Not authenticated')
    if (!can(getCallerMember(session), CAPABILITIES.INVENTORY_ADJUST)) {
      throw new Error('Insufficient permissions: inventory.count required')
    }

    const validated = countBatchSchema.parse(raw)
    const userId = session.userId ?? 'system'

    const adjustments = await Promise.all(
      validated.counts.map(({ productId, counted }) =>
        countStock({ productId, countedQuantity: counted, userId })
      )
    )

    const shopId = (session as { shopId?: string }).shopId ?? ''
    if (shopId) {
      for (const adj of adjustments) {
        if (adj.variance === 0) continue
        const syncCtx = buildSyncCtx(session)
        const syncEvent = buildCountSyncEvent(
          adj.productId,
          adj.newQuantity,
          adj.previousQuantity,
          syncCtx,
        )
        getRealSyncEngine().enqueue(syncEvent).catch(() => {})
      }
    }

    return { adjustments }
  })

  // ── Get Recent Movements ───────────────────────────────────────────────
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

  // ── Low Stock Products ─────────────────────────────────────────────────
  ipcMain.handle('db:inventory:lowStock', (_event) => {
    const db = getDatabase()
    return db.prepare(`
      SELECT id, name, current_stock, low_stock_threshold
      FROM products
      WHERE is_active = 1
        AND track_inventory = 1
        AND current_stock >= 0
        AND current_stock <= low_stock_threshold
      ORDER BY (CAST(current_stock AS REAL) / NULLIF(low_stock_threshold, 0)) ASC
    `).all()
  })

  log.info('Stock IPC handlers registered (receive/transfer/count added in Phase 09)')
}
