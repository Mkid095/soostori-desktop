import { ipcMain } from 'electron'
import log from 'electron-log'
import { printReceipt, testPrintReceipt } from '../hardware/printer'

let SerialPort: any = null
let serialportLoaded = false

try {
  const serialport = require('serialport')
  SerialPort = serialport.SerialPort
  serialportLoaded = true
} catch (err: unknown) {
  log.warn('SerialPort not available for printer:', (err as Error).message)
}

let printerPort: any = null

export function registerPrinterHandlers(): void {
  ipcMain.handle('hw:printer:connect', (_event, port: string, baudRate: number) => {
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

  ipcMain.handle('hw:printer:print', async (_event, receiptData: any) => {
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
    log.info('System print requested')
  })

  log.info('Printer IPC handlers registered')
}
