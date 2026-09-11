/**
 * sale-refund-handlers.ts — Sale refund IPC handler (host path).
 *
 * Phase 04: capability enforcement — sales.refund required.
 * Phase 10: partial/full refund, reason required, payment method,
 *           emits sale.refunded sync event.
 */

import { ipcMain } from 'electron'
import { getDatabase } from '../database'
import log from 'electron-log'
import { desktopLoadSession } from '../auth/electron-store-session'
import { adjustStock } from '../sdk/inventory-orchestrator'
import { syncService } from '../sync/sync-service'
import { resolveActiveShopId } from '../database/active-shop'
import { getRealSyncEngine } from '../sync/sync-engine'
import { fromLocalSale, type SalesRow } from '../database/contracts-mapper-2'
import { buildRefundSyncEvent } from '../database/sync-event-builder'
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

interface RefundInput {
  saleId: string
  lineItems?: Array<{ productId: string; quantity: number }>
  refundAmount: number
  reason: string
  paymentMethod: 'cash' | 'mobile_money' | 'card'
}

export function registerSaleRefundHandlers(): void {
  /**
   * Refund a completed sale — full or partial.
   * Phase 10: reason required, partial/full supported via lineItems.
   */
  ipcMain.handle('db:sales:refund', async (_event, input: RefundInput) => {
    const { saleId, lineItems, refundAmount, reason, paymentMethod } = input

    if (!reason || reason.trim().length === 0) {
      throw new Error('Refund reason is required')
    }
    if (!saleId) throw new Error('Sale ID is required')

    const session = await desktopLoadSession()
    if (!session) throw new Error('Not authenticated')
    if (!can(getCallerMember(session), CAPABILITIES.SALES_REFUND)) {
      throw new Error('Insufficient permissions: sales.refund required')
    }

    const userId = session.userId ?? 'system'
    const db = getDatabase()
    const shopId = await resolveActiveShopId()

    const sale = db.prepare('SELECT * FROM sales WHERE id = ? AND shop_id = ?').get(saleId, shopId) as {
      id: string; status: string; total_amount: number
    } | undefined
    if (!sale) throw new Error('Sale not found')
    if (sale.status === 'refunded') throw new Error('Sale already refunded')
    if (sale.status !== 'completed') throw new Error('Only completed sales can be refunded')

    // Determine which items to refund
    const allItems = db.prepare('SELECT * FROM sale_items WHERE sale_id = ? AND shop_id = ?').all(saleId, shopId) as Array<{
      product_id: string | null; quantity: number; product_name: string; total_price: number
    }>

    const isPartial = Boolean(lineItems && lineItems.length > 0)
    const itemsToRefund = isPartial
      ? allItems.filter(ai => lineItems!.some(li => li.productId === ai.product_id))
      : allItems

    for (const item of itemsToRefund) {
      if (!item.product_id) continue
      const refundQty = isPartial
        ? (lineItems!.find(li => li.productId === item.product_id)?.quantity ?? item.quantity)
        : item.quantity
      try {
        await adjustStock({ productId: item.product_id, quantity: refundQty, reason: `refund:${saleId}`, userId })
      } catch {
        throw Object.assign(
          new Error('Refund blocked: Primary Device must be ONLINE. Restore stock manually if needed.'),
          { code: 'STOCK_AUTHORIZATION_ERROR' },
        )
      }
    }

    const newStatus = isPartial ? 'completed' : 'refunded'
    db.prepare("UPDATE sales SET status = ?, updated_at = ? WHERE id = ? AND shop_id = ?")
      .run(newStatus, new Date().toISOString(), saleId, shopId)

    // Phase 10: emit sale.refunded sync event
    const saleRow = db.prepare('SELECT * FROM sales WHERE id = ? AND shop_id = ?').get(saleId, shopId) as SalesRow | undefined
    if (saleRow) {
      const refundedSale: Sale = fromLocalSale(saleRow)
      const syncEvent = buildRefundSyncEvent(refundedSale, {
        businessId: asBusinessId(refundedSale.businessId),
        originatingDeviceId: asDeviceId(session?.deviceId ?? 'system'),
        originatingEmployeeId: asEmployeeId(session?.userId ?? userId),
        clientSequence: Date.now(),
        reason: reason.trim(),
        refundAmount,
        isPartial,
      })
      getRealSyncEngine().enqueue(syncEvent).catch(() => {})
    }

    syncService.sendLocalMutation('SALE_REFUNDED', { saleId })
    log.info(`Sale ${saleId} ${isPartial ? 'partially' : 'fully'} refunded by ${userId}: ${reason}`)

    return {
      id: saleId,
      status: newStatus,
      refundAmount,
      isPartial,
      reason,
      paymentMethod,
    }
  })
}
