// Re-export all IPC interfaces
export type { DbIpc } from './ipc-signatures-db'
export type { HwIpc, AppIpc, UpdaterIpc } from './ipc-signatures-hw'

import type { DbIpc } from './ipc-signatures-db'
import type { HwIpc, AppIpc, UpdaterIpc } from './ipc-signatures-hw'

export interface ElectronAPI {
  db: DbIpc
  hw: HwIpc
  app: AppIpc
  updater: UpdaterIpc
  onLowStockNotification: (callback: (data: { productName: string; stock: number }) => void) => () => void
}
