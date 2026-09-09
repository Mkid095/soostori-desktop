/**
 * cloud-entity-sale.ts — Sale push to cloud InstantDB.
 * Part of cloud-entity-sync split per ANPAS (≤150 lines per file).
 */

import { getDatabase } from '../database'
import * as instant from './instant-api'
import log from 'electron-log'

const APP_ID = process.env.INSTANT_APP_ID || ''

export async function pushSale(saleId: string): Promise<void> {
  if (!APP_ID) return
  const db = getDatabase()
  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId) as Record<string, unknown> | undefined
  if (!sale) return

  try {
    await instant.instamlTx(APP_ID, [[
      'update', 'sales', saleId, {
        id: saleId,
        shopId: (sale.shop_id as string) ?? '',
        userId: (sale.user_id as string) ?? '',
        deviceId: (sale.device_id as string) ?? '',
        type: sale.type as string ?? 'retail',
        status: sale.status as string ?? 'completed',
        subtotal: Number(sale.subtotal) || 0,
        discountAmount: Number(sale.discount_amount) || 0,
        taxAmount: Number(sale.tax_amount) || 0,
        totalAmount: Number(sale.total_amount) || 0,
        paidAmount: Number(sale.paid_amount) || 0,
        paymentMethod: sale.payment_method as string ?? 'cash',
        note: sale.note as string | null,
        customerId: sale.customer_id as string | null,
        customerName: sale.customer_name as string | null,
        customerPhone: sale.customer_phone as string | null,
        itemsSummary: sale.items_summary as string | null,
        createdAt: sale.created_at as string,
        updatedAt: new Date().toISOString(),
      }
    ]])
  } catch (err) {
    log.warn('pushSale failed:', err)
  }
}
