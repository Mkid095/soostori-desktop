// Re-export all IPC interfaces
export type { DbIpc } from './ipc-signatures-db'
export type { HwIpc, AppIpc, UpdaterIpc, CloudIpc } from './ipc-signatures-hw'

import type { DbIpc } from './ipc-signatures-db'
import type { HwIpc, AppIpc, UpdaterIpc, CloudIpc, CloudAuthIpc } from './ipc-signatures-hw'

export interface ElectronAPI {
  db: DbIpc
  hw: HwIpc
  app: AppIpc
  updater: UpdaterIpc
  cloud: CloudIpc
  cloudAuth: CloudAuthIpc
  onLowStockNotification: (callback: (data: { productName: string; stock: number }) => void) => () => void
}
