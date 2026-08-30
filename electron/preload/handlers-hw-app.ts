import { ipcRenderer } from 'electron'
import type { HwIpc, AppIpc, UpdaterIpc } from './ipc-signatures'
import type { UpdateStatusData } from './types'

export const hwHandlers: HwIpc = {
  onBarcodeScanned: (callback: (barcode: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, barcode: string) => callback(barcode)
    ipcRenderer.on('hw:scanner:barcode', handler)
    return () => ipcRenderer.removeListener('hw:scanner:barcode', handler)
  },
  startSerialScanner: (port: string, baudRate: number) =>
    ipcRenderer.invoke('hw:scanner:startSerial', port, baudRate),
  stopSerialScanner: () => ipcRenderer.invoke('hw:scanner:stopSerial'),
  listSerialPorts: () => ipcRenderer.invoke('hw:listPorts'),
  autoDetectScanner: () => ipcRenderer.invoke('hw:scanner:autoDetect'),
  getAutoDetectedScannerPort: () => ipcRenderer.invoke('hw:scanner:getAutoDetected'),
  saveAutoDetectedScannerPort: (port: string) => ipcRenderer.invoke('hw:scanner:saveAutoDetected', port),
  getSavedScannerPort: () => ipcRenderer.invoke('hw:scanner:getSavedPort'),
  setScannerType: (type: 'keyboard' | 'serial') => ipcRenderer.invoke('hw:scanner:setType', type),
  getScannerType: () => ipcRenderer.invoke('hw:scanner:getType'),
  printReceipt: (data) => ipcRenderer.invoke('hw:printer:print', data),
  printViaSystemDialog: (html: string) => ipcRenderer.invoke('hw:printer:printSystem', html),
  connectPrinter: (port: string, baudRate: number) =>
    ipcRenderer.invoke('hw:printer:connect', port, baudRate),
  disconnectPrinter: () => ipcRenderer.invoke('hw:printer:disconnect'),
  testPrint: () => ipcRenderer.invoke('hw:printer:test'),
}

export const appHandlers: AppIpc = {
  getVersion: () => ipcRenderer.invoke('app:version'),
  getPlatform: () => process.platform,
  minimize: () => ipcRenderer.send('app:window:minimize'),
  maximize: () => ipcRenderer.send('app:window:maximize'),
  close: () => ipcRenderer.send('app:window:close'),
  isMaximized: () => ipcRenderer.invoke('app:window:isMaximized'),
  onMaximizeChange: (callback: (isMaximized: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, isMaximized: boolean) => callback(isMaximized)
    ipcRenderer.on('app:window:maximizeChange', handler)
    return () => ipcRenderer.removeListener('app:window:maximizeChange', handler)
  },
  showSaveDialog: (options: unknown) => ipcRenderer.invoke('app:dialog:save', options),
  showOpenDialog: (options: unknown) => ipcRenderer.invoke('app:dialog:open', options),
  exportDatabase: (filePath: string) => ipcRenderer.invoke('app:db:export', filePath),
  importDatabase: (filePath: string) => ipcRenderer.invoke('app:db:import', filePath),
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke('app:file:write', filePath, content),
}

export const updaterHandlers: UpdaterIpc = {
  check: () => ipcRenderer.invoke('updater:check'),
  download: () => ipcRenderer.invoke('updater:download'),
  install: () => ipcRenderer.send('updater:install'),
  status: () => ipcRenderer.invoke('updater:status'),
  onStatus: (callback: (data: UpdateStatusData) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: UpdateStatusData) => callback(data)
    ipcRenderer.on('updater:status', handler)
    return () => ipcRenderer.removeListener('updater:status', handler)
  },
}
