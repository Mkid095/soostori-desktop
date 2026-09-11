// Re-export all IPC interfaces
export type { DbIpc } from './ipc-signatures-db'
export type { HwIpc, AppIpc, UpdaterIpc, CloudIpc } from './ipc-signatures-hw'
export type { NotificationRecord, NotificationPrefRecord, NotificationPriority } from './ipc-signatures-db'

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
  /** Tray: user clicked an OS notification */
  onNotificationClicked: (callback: (data: { id: string; eventType: string; data?: Record<string, unknown> }) => void) => () => void
  /** Tray: open notifications panel */
  onOpenNotifications: (callback: () => void) => () => void
  /** Tray: mark all notifications read */
  onMarkAllNotificationsRead: (callback: () => void) => () => void
}
