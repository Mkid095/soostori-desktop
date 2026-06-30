import { ipcMain, BrowserWindow } from 'electron'
import log from 'electron-log'
import { printReceipt, testPrintReceipt } from '../hardware/printer'

// Try to load serialport dynamically to avoid native module errors
let SerialPort: any = null
let ReadlineParser: any = null
let serialportLoaded = false

try {
  const serialport = require('serialport')
  SerialPort = serialport.SerialPort
  ReadlineParser = serialport.ReadlineParser
  serialportLoaded = true
  log.info('SerialPort loaded successfully')
} catch (err) {
  log.warn('SerialPort not available, hardware features disabled:', err.message)
}

let serialScanner: any = null
let scannerParser: any = null
let printerPort: any = null
let autoDetectedScannerPort: string | null = null

// Persist scanner port using electron-store
let store: any = null
try {
  const ElectronStore = require('electron-store')
  store = new ElectronStore({ name: 'scanner-settings' })
} catch {
  log.warn('electron-store not available for scanner settings')
}

export function registerHardwareHandlers(): void {
  // ========== SERIAL PORT LISTING ==========

  ipcMain.handle('hw:listPorts', async () => {
    if (!serialportLoaded || !SerialPort) {
      return []
    }
    try {
      const ports = await SerialPort.list()
      return ports.map((p: any) => p.path)
    } catch (error) {
      log.error('Failed to list serial ports:', error)
      return []
    }
  })

  // ========== SCANNER ==========

  ipcMain.handle('hw:scanner:startSerial', (event, port: string, baudRate: number) => {
    if (!serialportLoaded || !SerialPort) {
      throw new Error('SerialPort not available')
    }
    return new Promise<void>((resolve, reject) => {
      if (serialScanner && serialScanner.isOpen) {
        serialScanner.close()
      }

      serialScanner = new SerialPort({
        path: port,
        baudRate: baudRate || 9600,
        dataBits: 8,
        parity: 'none',
        stopBits: 1,
      })

      scannerParser = serialScanner.pipe(new ReadlineParser({ delimiter: '\r\n' }))

      serialScanner.on('open', () => {
        log.info(`Serial scanner connected on ${port} at ${baudRate} baud`)
        resolve()
      })

      scannerParser.on('data', (data: string) => {
        const barcode = data.trim().toUpperCase()
        if (barcode.length > 0) {
          log.debug(`Barcode scanned: ${barcode}`)
          const win = BrowserWindow.getFocusedWindow()
          if (win) {
            win.webContents.send('hw:scanner:barcode', barcode)
          }
        }
      })

      serialScanner.on('error', (err: Error) => {
        log.error('Serial scanner error:', err)
        reject(err)
      })

      serialScanner.on('close', () => {
        log.info('Serial scanner disconnected')
      })
    })
  })

  ipcMain.handle('hw:scanner:stopSerial', async () => {
    if (serialScanner && serialScanner.isOpen) {
      await new Promise<void>((resolve) => {
        serialScanner.close(() => {
          log.info('Serial scanner stopped')
          resolve()
        })
      })
      serialScanner = null
      scannerParser = null
    }
  })

  ipcMain.handle('hw:scanner:autoDetect', async () => {
    if (!serialportLoaded || !SerialPort) {
      return null
    }
    try {
      const ports = await SerialPort.list()
      if (ports.length === 0) return null

      const BAUD_RATES = [9600, 19200, 38400, 57600, 115200]
      const TIMEOUT_MS = 1500

      for (const portInfo of ports) {
        const portPath = portInfo.path
        for (const baudRate of BAUD_RATES) {
          try {
            const testPort = new SerialPort({
              path: portPath,
              baudRate,
              dataBits: 8,
              parity: 'none',
              stopBits: 1,
            })

            const data = await new Promise<string>((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)
              const parser = testPort.pipe(new ReadlineParser({ delimiter: '\r\n' }))

              const cleanup = () => {
                clearTimeout(timeout)
                parser.removeAllListeners('data')
                testPort.removeAllListeners('error')
              }

              parser.on('data', (d: string) => {
                cleanup()
                resolve(d.trim())
              })

              testPort.on('error', (err: Error) => {
                cleanup()
                reject(err)
              })

              testPort.on('open', () => {
                // Wait for data or timeout
              })
            })

            // Got data - this is likely a scanner
            testPort.close(() => {
              log.info(`Auto-detected scanner on ${portPath} at ${baudRate} baud`)
            })
            autoDetectedScannerPort = portPath
            return { port: portPath, baudRate }

          } catch {
            // This baud rate didn't work, try next
            try { testPort.close(() => {}) } catch {}
          }
        }
      }
      return null
    } catch (error) {
      log.error('Auto-detect failed:', error)
      return null
    }
  })

  ipcMain.handle('hw:scanner:getAutoDetected', () => autoDetectedScannerPort)

  ipcMain.handle('hw:scanner:saveAutoDetected', (_event, port: string) => {
    autoDetectedScannerPort = port
    if (store) store.set('scannerPort', port)
  })

  ipcMain.handle('hw:scanner:getSavedPort', () => {
    if (store) return store.get('scannerPort', null)
    return autoDetectedScannerPort
  })

  ipcMain.handle('hw:scanner:setType', (_event, type: 'keyboard' | 'serial') => {
    if (store) store.set('scannerType', type)
  })

  ipcMain.handle('hw:scanner:getType', () => {
    if (store) return store.get('scannerType', 'keyboard')
    return 'keyboard'
  })

  // ========== PRINTER ==========

  ipcMain.handle('hw:printer:connect', (event, port: string, baudRate: number) => {
    if (!serialportLoaded || !SerialPort) {
      throw new Error('SerialPort not available')
    }
    return new Promise<void>((resolve, reject) => {
      if (printerPort && printerPort.isOpen) {
        printerPort.close()
      }

      printerPort = new SerialPort({
        path: port,
        baudRate: baudRate || 9600,
        dataBits: 8,
        parity: 'none',
        stopBits: 1,
      })

      printerPort.on('open', () => {
        log.info(`Printer connected on ${port} at ${baudRate} baud`)
        resolve()
      })

      printerPort.on('error', (err: Error) => {
        log.error('Printer error:', err)
        reject(err)
      })

      printerPort.on('close', () => {
        log.info('Printer disconnected')
        printerPort = null
      })
    })
  })

  ipcMain.handle('hw:printer:disconnect', async () => {
    if (printerPort && printerPort.isOpen) {
      await new Promise<void>((resolve) => {
        printerPort.close(() => resolve())
      })
      printerPort = null
    }
  })

  ipcMain.handle('hw:printer:print', async (event, receiptData: any) => {
    try {
      if (printerPort && printerPort.isOpen) {
        await printReceipt(printerPort, receiptData)
        log.info('Receipt printed via ESC/POS')
      } else {
        log.warn('Printer not connected, cannot print')
        throw new Error('Printer not connected')
      }
    } catch (error) {
      log.error('Failed to print receipt:', error)
      throw error
    }
  })

  ipcMain.handle('hw:printer:test', async () => {
    try {
      if (printerPort && printerPort.isOpen) {
        await testPrintReceipt(printerPort)
        log.info('Test receipt printed')
      } else {
        throw new Error('Printer not connected')
      }
    } catch (error) {
      log.error('Failed to print test receipt:', error)
      throw error
    }
  })

  ipcMain.handle('hw:printer:printSystem', async () => {
    // System print is handled via renderer using window.print()
    log.info('System print requested')
  })

  log.info('Hardware IPC handlers registered', serialportLoaded ? '(with serialport)' : '(serialport disabled)')
}
