/**
 * sale-void-handlers.ts — Sale void (POS "cancel completed sale") IPC handler.
 *
 * Phase 04: capability enforcement — sales.void required.
 * Phase 10: emits sale.voided sync event + reason required.
 */

import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import log from 'electron-log'
import { desktopLoadSession } from '../auth/electron-store-session'
import { resolveActiveShopId } from '../database/active-shop'
import { syncService } from '../sync/sync-service'
import { getRealSyncEngine } from '../sync/sync-engine'
import { fromLocalSale, type SalesRow } from '../database/contracts-mapper-2'
import { buildVoidSyncEvent } from '../database/sync-event-builder'
import { can, CAPABILITIES } from '@soostori/auth'
import type { Member } from '@soostori/auth'
import type { EmployeeRole } from '@soostori/core'
import type { Sale } from '@soostori/contracts'
import { asBusinessId, asEmployeeId, asDeviceId } from '@soostori/core'

function getCallerMember(session: { employeeId: string }): Member {
  const db = getDatabase()
  const row = db.prepare('SELECT role FROM employees WHERE id = ?').get(session.employeeId) as { role: string } | undefined
  return { role: (row?.role ?? 'cashier') as EmployeeRole }
}

export function registerSaleVoidHandlers(): void {
  /**
   * Void a completed sale — marks it cancelled and restores stock.
   * Requires sales.void capability.
   * Phase 10: reason is required.
   */
  ipcMain.handle('db:sales:void', async (_event, saleId: string, reason: string) => {
    if (!reason || reason.trim().length === 0) {
      throw new Error('Void reason is required')
    }

    const session = await desktopLoadSession()
    if (!session) throw new Error('Not authenticated')
    if (!can(getCallerMember(session), CAPABILITIES.SALES_VOID)) {
      throw new Error('Insufficient permissions: sales.void required')
    }

    const db = getDatabase()
    const shopId = await resolveActiveShopId()

    const sale = db.prepare('SELECT * FROM sales WHERE id = ? AND shop_id = ?').get(saleId, shopId) as {
      id: string; status: string; items_summary: string | null
    } | undefined
    if (!sale) throw new Error('Sale not found')
    if (sale.status === 'cancelled') throw new Error('Sale already voided')
    if (sale.status !== 'completed') throw new Error('Only completed sales can be voided')

    // Restore stock for each item
    const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ? AND shop_id = ?').all(saleId, shopId) as Array<{
      product_id: string | null; quantity: number
    }>
    for (const item of items) {
      if (!item.product_id) continue
      db.prepare(
        `INSERT INTO stock_movements (id, product_id, shop_id, type, quantity, reason, created_at)
         VALUES (?, ?, ?, 'adjustment', ?, ?, datetime('now'))`,
      ).run(
        `${saleId}-restore-${item.product_id}`,
        item.product_id,
        shopId,
        item.quantity,
        `void:${saleId}`,
      )
      db.prepare(
        `UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ? AND shop_id = ?`,
      ).run(item.quantity, item.product_id, shopId)
    }

    db.prepare("UPDATE sales SET status = 'cancelled', updated_at = ? WHERE id = ? AND shop_id = ?")
      .run(new Date().toISOString(), saleId, shopId)

    // Phase 10: emit sale.voided sync event
    const saleRow = db.prepare('SELECT * FROM sales WHERE id = ? AND shop_id = ?').get(saleId, shopId) as SalesRow | undefined
    if (saleRow) {
      const voidedSale: Sale = fromLocalSale(saleRow)
      const syncEvent = buildVoidSyncEvent(voidedSale, {
        businessId: asBusinessId(voidedSale.businessId),
        originatingDeviceId: asDeviceId(session?.deviceId ?? 'system'),
        originatingEmployeeId: asEmployeeId(session?.userId ?? 'system'),
        clientSequence: Date.now(),
        reason: reason.trim(),
      })
      getRealSyncEngine().enqueue(syncEvent).catch(() => {})
    }

    syncService.sendLocalMutation('SALE_VOIDED', { saleId })
    log.info(`Sale ${saleId} voided by ${session.userId}: ${reason}`)
    return { id: saleId, status: 'cancelled', reason }
  })

  log.info('Sale void IPC handlers registered')
}
