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
