import { ipcMain, BrowserWindow } from 'electron'
import log from 'electron-log'
import { autoDetectSerialScanner } from './scanner-auto-detect'
import type { SerialPort, SerialPortInstance } from '../../src/types/serialport.d'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const serialport = require('serialport') as { SerialPort: SerialPort; ReadlineParser: new (o: { delimiter: string }) => object }
const SerialPortClass = serialport.SerialPort
const ReadlineParserClass = serialport.ReadlineParser

let serialScanner: SerialPortInstance | null = null
let scannerParser: object | null = null
let autoDetectedPort: string | null = null

// eslint-disable-next-line @typescript-eslint/no-var-requires
let store: { get(key: string, fallback: unknown): unknown; set(key: string, value: unknown): void } | null = null
try {
  const ElectronStore = require('electron-store')
  store = new ElectronStore({ name: 'scanner-settings' })
} catch {
  log.warn('electron-store not available for scanner settings')
}

export function registerScannerHandlers(): void {
  ipcMain.handle('hw:listPorts', async () => {
    try {
      const ports = await SerialPortClass.list()
      return ports.map((p: { path: unknown }) => String(p.path))
    } catch { return [] }
  })

  ipcMain.handle('hw:scanner:startSerial', (_event, port: string, baudRate: number) => {
    return new Promise<void>((resolve, reject) => {
      if (serialScanner?.isOpen) serialScanner.close()
      const scanner: SerialPortInstance = new SerialPortClass({
        path: port,
        baudRate: baudRate || 9600,
        dataBits: 8,
        parity: 'none',
        stopBits: 1,
      })
      serialScanner = scanner
      scannerParser = scanner.pipe(new ReadlineParserClass({ delimiter: '\r\n' }))
      scanner.on('open', () => { log.info(`Scanner on ${port}`); resolve() })
      scanner.on('data', (data: unknown) => {
        const barcode = String(data).trim().toUpperCase()
        if (barcode.length > 0) {
          const win = BrowserWindow.getFocusedWindow()
          win?.webContents.send('hw:scanner:barcode', barcode)
        }
      })
      scanner.on('error', (err: unknown) => { log.error('Scanner error:', err); reject(err) })
      scanner.on('close', () => log.info('Scanner disconnected'))
    })
  })

  ipcMain.handle('hw:scanner:stopSerial', async () => {
    if (serialScanner?.isOpen) {
      const scanner = serialScanner
      await new Promise<void>((resolve) => {
        scanner.close(() => { log.info('Scanner stopped'); resolve() })
      })
      serialScanner = null
      scannerParser = null
    }
  })

  ipcMain.handle('hw:scanner:autoDetect', async () => autoDetectSerialScanner())

  ipcMain.handle('hw:scanner:getAutoDetected', () => autoDetectedPort)

  ipcMain.handle('hw:scanner:saveAutoDetected', (_event, port: string) => {
    autoDetectedPort = port
    if (store) store.set('scannerPort', port)
  })

  ipcMain.handle('hw:scanner:getSavedPort', () => (store?.get('scannerPort', null) as string | null) ?? autoDetectedPort)

  ipcMain.handle('hw:scanner:setType', (_event, type: 'keyboard' | 'serial') => { if (store) store.set('scannerType', type) })
  ipcMain.handle('hw:scanner:getType', () => (store?.get('scannerType', 'keyboard') as string) ?? 'keyboard')

  log.info('Scanner IPC handlers registered')
}
