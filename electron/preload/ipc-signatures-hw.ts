// IPC signatures — Hardware, App, Updater
import type { ReceiptData, UpdateStatusData } from './types'

export interface HwIpc {
  onBarcodeScanned: (callback: (barcode: string) => void) => () => void
  startSerialScanner: (port: string, baudRate: number) => Promise<void>
  stopSerialScanner: () => Promise<void>
  listSerialPorts: () => Promise<string[]>
  autoDetectScanner: () => Promise<{ port: string; baudRate: number } | null>
  getAutoDetectedScannerPort: () => Promise<string | null>
  saveAutoDetectedScannerPort: (port: string) => Promise<void>
  getSavedScannerPort: () => Promise<string | null>
  setScannerType: (type: 'keyboard' | 'serial') => Promise<void>
  getScannerType: () => Promise<'keyboard' | 'serial'>
  printReceipt: (data: ReceiptData) => Promise<void>
  printViaSystemDialog: (html: string) => Promise<void>
  connectPrinter: (port: string, baudRate: number) => Promise<void>
  disconnectPrinter: () => Promise<void>
  testPrint: () => Promise<void>
}

export interface AppIpc {
  getVersion: () => Promise<string>
  getPlatform: () => string
  minimize: () => void
  maximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>
  onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void
  showSaveDialog: (options: unknown) => Promise<string | null>
  showOpenDialog: (options: unknown) => Promise<string[] | null>
  exportDatabase: (filePath: string) => Promise<void>
  importDatabase: (filePath: string) => Promise<void>
  writeFile: (filePath: string, content: string) => Promise<void>
}

export interface UpdaterIpc {
  check: () => Promise<{ status: string; version?: string; message?: string }>
  download: () => Promise<{ status: string; message?: string }>
  install: () => void
  status: () => Promise<{ status: string; version?: string }>
  onStatus: (callback: (data: UpdateStatusData) => void) => () => void
}

export interface CloudIpc {
  syncEvents: () => Promise<{ pushed: number }>
  syncShopSettings: () => Promise<{ success: boolean; error?: string }>
  pullShopSettings: () => Promise<{ success: boolean; error?: string }>
  heartbeat: (deviceId: string) => Promise<{ success: boolean }>
  subscription: () => Promise<{ valid: boolean; plan: string | null; deviceLimit: number | null; expiryDate: string | null }>
  fullSync: () => Promise<{ success: boolean; error?: string }>
  health: () => Promise<{ reachable: boolean; latencyMs: number | null }>
  reconnect: () => Promise<{ ok: boolean }>
}

export interface CloudAuthIpc {
  requestMagicCode: (email: string) => Promise<{ codeSent: boolean; message: string }>
  verifyMagicCode: (email: string, code: string) => Promise<{ success: boolean; session?: Record<string, unknown>; error?: string }>
  registerDevice: (data: { email: string; deviceId: string; deviceName: string; cloudUser: Record<string, unknown>; employeeId: string; employeeName: string }) => Promise<{ success: boolean; session?: Record<string, unknown>; shop?: Record<string, unknown>; employeeCount?: number; error?: string }>
  getSession: () => Promise<Record<string, unknown> | null>
  logout: () => Promise<{ success: boolean }>
  syncEmployees: (shopId?: string) => Promise<{ employees: Record<string, unknown>[]; count: number }>
  subscription: (shopId?: string) => Promise<{ valid: boolean; plan: string | null; deviceLimit: number | null; expiryDate: string | null }>
  restoreSession: () => Promise<{ restored: boolean; employeeCount?: number }>
  createInvite: (data: { shopId: string; employeeName: string; role: string; createdBy: string; deviceName?: string }) => Promise<{ id: string; code: string; expiresAt: string }>
  acceptInvite: (data: { code: string; userName: string; pin: string; deviceId: string; deviceName?: string }) => Promise<{ userId: string; deviceId: string }>
  getEmployees: (shopId?: string) => Promise<Record<string, unknown>[]>
}
