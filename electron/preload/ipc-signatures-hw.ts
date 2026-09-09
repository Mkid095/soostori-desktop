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
  check: () => Promise<UpdateStatusData>
  download: () => Promise<UpdateStatusData>
  install: () => Promise<{ blocked?: boolean; reason?: string }>
  status: () => Promise<UpdateStatusData>
  abort: () => Promise<UpdateStatusData>
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
  pullProducts: () => Promise<{ success: boolean; count?: number; error?: string }>
  pullCategories: () => Promise<{ success: boolean; count?: number; error?: string }>
  pullCustomers: () => Promise<{ success: boolean; count?: number; error?: string }>
  pullAll: () => Promise<{ success: boolean; counts?: { products: number; categories: number; customers: number }; error?: string }>
}

export interface CloudAuthIpc {
  requestMagicCode: (email: string) => Promise<{ codeSent: boolean; message: string }>
  verifyMagicCode: (email: string, code: string) => Promise<{ success: boolean; session?: Record<string, unknown>; error?: string }>
  registerDevice: (data: { email: string; deviceId: string; deviceName: string; cloudUser: Record<string, unknown>; employeeId: string; employeeName: string }) => Promise<{ success: boolean; session?: Record<string, unknown>; shop?: Record<string, unknown>; employeeCount?: number; error?: string }>
  getSession: () => Promise<Record<string, unknown> | null>
  logout: () => Promise<{ success: boolean }>
  syncEmployees: (shopId?: string) => Promise<{ employees: Record<string, unknown>[]; count: number }>
  subscription: (shopId?: string) => Promise<{ valid: boolean; plan: string | null; deviceLimit: number | null; expiryDate: string | null }>
  restoreSession: () => Promise<{
    restored: boolean
    userId?: string
    email?: string
    shopId?: string
    employeeId?: string
    deviceId?: string
    employeeCount?: number
  }>
  createInvite: (data: { shopId: string; employeeName: string; role: string; createdBy: string; deviceName?: string }) => Promise<{ id: string; code: string; expiresAt: string }>
  acceptInvite: (data: { code: string; userName: string; pin: string; deviceId: string; deviceName?: string }) => Promise<{ userId: string; deviceId: string }>
  getEmployees: (shopId?: string) => Promise<Record<string, unknown>[]>
}

/** @soostori/auth CloudAuth SDK — Google OAuth + email/password via FIDScript */
export interface CloudAuthSdkIpc {
  signInWithGoogle(config: { clientId: string; redirectUri: string; scopes?: string[] }): Promise<{ started: boolean; error?: string }>
  handleOAuthCallback(code: string, state: string, codeVerifier: string, redirectUri: string): Promise<{ success: boolean; userId?: string; email?: string; isNewUser?: boolean; error?: string }>
  signInWithEmail(email: string, password: string): Promise<{ success: boolean; userId?: string; email?: string; isEmailVerified?: boolean; error?: string }>
  restoreSession(): Promise<{ restored: boolean; userId?: string; email?: string; shopId?: string; employeeId?: string; deviceId?: string; isStale?: boolean }>
  refreshSession(): Promise<{ refreshed: boolean; error?: string }>
  signOut(): Promise<{ success: boolean }>
  onAuthEvent(callback: (event: { type: string; userId?: string; email?: string; error?: string }) => void): () => void
  getSession(): Promise<{ hasSession: boolean; userId?: string; email?: string }>
  setNetworkStatus(isOnline: boolean): void
}

/** Rendered notification from @soostori/notifications engine */
export interface RenderedNotification {
  id: string
  title: string
  body: string
  priority: string
  data?: Record<string, unknown>
  timestamp: number
  read: boolean
}
