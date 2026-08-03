import { ipcMain, BrowserWindow } from 'electron'
import log from 'electron-log'
import { autoDetectSerialScanner } from './scanner-auto-detect'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SerialPort: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ReadlineParser: any = null
let serialportLoaded = false

try {
  const serialport = require('serialport')
  SerialPort = serialport.SerialPort
  ReadlineParser = serialport.ReadlineParser
  serialportLoaded = true
  log.info('SerialPort loaded successfully')
} catch (err: unknown) {
  log.warn('SerialPort not available:', (err as Error).message)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let serialScanner: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let scannerParser: any = null
let autoDetectedPort: string | null = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let store: any = null
try {
  const ElectronStore = require('electron-store')
  store = new ElectronStore({ name: 'scanner-settings' })
} catch {
  log.warn('electron-store not available for scanner settings')
}

export function registerScannerHandlers(): void {
  ipcMain.handle('hw:listPorts', async () => {
    if (!serialportLoaded || !SerialPort) return []
    try {
      const ports = await SerialPort.list()
      return ports.map((p: { path: unknown }) => String(p.path))
    } catch { return [] }
  })

  ipcMain.handle('hw:scanner:startSerial', (_event, port: string, baudRate: number) => {
    if (!serialportLoaded || !SerialPort) throw new Error('SerialPort not available')
    return new Promise<void>((resolve, reject) => {
      if (serialScanner?.isOpen) serialScanner.close()
      serialScanner = new SerialPort({ path: port, baudRate: baudRate || 9600, dataBits: 8, parity: 'none', stopBits: 1 })
      scannerParser = serialScanner.pipe(new ReadlineParser({ delimiter: '\r\n' }))
      serialScanner.on('open', () => { log.info(`Scanner on ${port}`); resolve() })
      scannerParser.on('data', (data: string) => {
        const barcode = data.trim().toUpperCase()
        if (barcode.length > 0) {
          const win = BrowserWindow.getFocusedWindow()
          win?.webContents.send('hw:scanner:barcode', barcode)
        }
      })
      serialScanner.on('error', (err: Error) => { log.error('Scanner error:', err); reject(err) })
      serialScanner.on('close', () => log.info('Scanner disconnected'))
    })
  })

  ipcMain.handle('hw:scanner:stopSerial', async () => {
    if (serialScanner?.isOpen) {
      await new Promise<void>(resolve => { serialScanner.close(() => { log.info('Scanner stopped'); resolve() }) })
      serialScanner = null; scannerParser = null
    }
  })

  ipcMain.handle('hw:scanner:autoDetect', async () => autoDetectSerialScanner())

  ipcMain.handle('hw:scanner:getAutoDetected', () => autoDetectedPort)

  ipcMain.handle('hw:scanner:saveAutoDetected', (_event, port: string) => {
    autoDetectedPort = port
    if (store) store.set('scannerPort', port)
  })

  ipcMain.handle('hw:scanner:getSavedPort', () => store?.get('scannerPort', null) ?? autoDetectedPort)

  ipcMain.handle('hw:scanner:setType', (_event, type: 'keyboard' | 'serial') => { if (store) store.set('scannerType', type) })
  ipcMain.handle('hw:scanner:getType', () => store?.get('scannerType', 'keyboard') ?? 'keyboard')

  log.info('Scanner IPC handlers registered')
}
