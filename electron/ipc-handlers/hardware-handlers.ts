export { registerScannerHandlers } from './scanner-handlers'
export { registerPrinterHandlers } from './printer-handlers'

import { registerScannerHandlers } from './scanner-handlers'
import { registerPrinterHandlers } from './printer-handlers'
import log from 'electron-log'

export function registerHardwareHandlers(): void {
  registerScannerHandlers()
  registerPrinterHandlers()
  log.info('Hardware IPC handlers registered')
}
