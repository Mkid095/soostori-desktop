/**
 * Sale mutation handlers — delegates to focused handler modules.
 *
 * Architecture (ANPAS):
 *   - sale-handlers-mutation.ts   → registration orchestration only (thin)
 *   - sale-create-handler.ts      → db:sales:create logic
 *   - sale-refund-handler.ts      → db:sales:refund logic
 *   - held-sale-handlers.ts       → held-sales CRUD
 *   - sale-stock-helpers.ts       → shared stock mutation helpers
 */

import log from 'electron-log'
import { registerHeldSaleHandlers } from './held-sale-handlers'
import { registerSaleCreateHandler } from './sale-create-handler'
import { registerSaleRefundHandler } from './sale-refund-handler'

export function registerSaleMutationHandlers(): void {
  registerHeldSaleHandlers()
  registerSaleCreateHandler()
  registerSaleRefundHandler()
  log.info('Sale mutation handlers registered')
}
