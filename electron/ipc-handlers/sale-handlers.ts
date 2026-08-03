export { registerSaleQueryHandlers } from './sale-handlers-query'
export { registerSaleMutationHandlers } from './sale-handlers-mutation'
import { registerSaleQueryHandlers } from './sale-handlers-query'
import { registerSaleMutationHandlers } from './sale-handlers-mutation'
import log from 'electron-log'

export function registerSaleHandlers(): void {
  registerSaleQueryHandlers()
  registerSaleMutationHandlers()
  log.info('All sale handlers registered')
}
