// Re-export all IPC interfaces
export type { DbIpc } from './ipc-signatures-db'
export type { HwIpc, AppIpc, UpdaterIpc, CloudIpc } from './ipc-signatures-hw'

import type { DbIpc } from './ipc-signatures-db'
import type { HwIpc, AppIpc, UpdaterIpc, CloudIpc, CloudAuthIpc, CloudAuthSdkIpc, RenderedNotification } from './ipc-signatures-hw'

export interface ElectronAPI {
  db: DbIpc
  hw: HwIpc
  app: AppIpc
  updater: UpdaterIpc
  cloud: CloudIpc
  cloudAuth: CloudAuthIpc
  cloudAuthSdk: CloudAuthSdkIpc | null
  onLowStockNotification: (callback: (data: { productName: string; stock: number }) => void) => () => void
  onSyncStatusChange: (callback: (mode: 'host' | 'client' | 'offline') => void) => () => void
  onSaleCompleted: (callback: (data: { saleId: string; total: number }) => void) => () => void
  /** @soostori/notifications engine — in-app channel rendered notification */
  onNotification: (callback: (data: RenderedNotification) => void) => () => void
}
