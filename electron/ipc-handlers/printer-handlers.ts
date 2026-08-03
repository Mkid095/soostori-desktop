import { ipcMain } from 'electron'
import log from 'electron-log'
import { printReceipt, testPrintReceipt, type ReceiptData } from '../hardware/printer'
import type { SerialPort, SerialPortInstance } from '../../src/types/serialport.d'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const serialport = require('serialport') as { SerialPort: SerialPort }
const SerialPortClass = serialport.SerialPort

let printerPort: SerialPortInstance | null = null

export function registerPrinterHandlers(): void {
  ipcMain.handle('hw:printer:connect', (_event, port: string, baudRate: number) => {
    return new Promise<void>((resolve, reject) => {
      if (printerPort && printerPort.isOpen) {
        printerPort.close()
      }

      const newPort: SerialPortInstance = new SerialPortClass({
        path: port,
        baudRate: baudRate || 9600,
        dataBits: 8,
        parity: 'none',
        stopBits: 1,
      })
      printerPort = newPort

      newPort.on('open', () => {
        log.info(`Printer connected on ${port} at ${baudRate} baud`)
        resolve()
      })

      newPort.on('error', (err: unknown) => {
        log.error('Printer error:', err)
        reject(err)
      })

      newPort.on('close', () => {
        log.info('Printer disconnected')
        printerPort = null
      })
    })
  })

  ipcMain.handle('hw:printer:disconnect', async () => {
    if (printerPort && printerPort.isOpen) {
      const port = printerPort
      await new Promise<void>((resolve) => {
        port.close(() => resolve())
      })
      printerPort = null
    }
  })

  ipcMain.handle('hw:printer:print', async (_event, receiptData: ReceiptData) => {
    try {
      if (printerPort && printerPort.isOpen) {
        await printReceipt(printerPort as unknown as SerialPort, receiptData)
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
        await testPrintReceipt(printerPort as unknown as SerialPort)
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
