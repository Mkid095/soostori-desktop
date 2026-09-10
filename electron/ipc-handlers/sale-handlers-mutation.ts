/**
 * sale-handlers-mutation.ts — Sale mutation IPC handler registration.
 * Split per ANPAS: create → sale-create-handlers.ts, held-sales → held-sale-handlers.ts.
 */

import { registerSaleCreateHandlers } from './sale-create-handlers'
import { registerSaleRefundHandlers } from './sale-refund-handlers'
import { registerHeldSaleHandlers } from './held-sale-handlers'
import { getDatabase } from '../database'
import log from 'electron-log'

export function registerSaleMutationHandlers(): void {
  // Ensure migration columns exist
  const db = getDatabase()
  const tableInfo = db.prepare(`PRAGMA table_info(sales)`).all() as Array<{ name: string }>
  if (!tableInfo.some(c => c.name === 'items_summary')) db.exec(`ALTER TABLE sales ADD COLUMN items_summary TEXT`)
  if (!tableInfo.some(c => c.name === 'customer_id_number')) db.exec(`ALTER TABLE sales ADD COLUMN customer_id_number TEXT`)

  registerSaleCreateHandlers()
  registerSaleRefundHandlers()
  registerHeldSaleHandlers()
  log.info('Sale mutation handlers registered')
}
