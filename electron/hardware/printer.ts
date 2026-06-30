import { SerialPort } from 'serialport'
import log from 'electron-log'

// ESC/POS Commands
const ESC = 0x1b
const GS = 0x1d

const ESC_POS = {
  // Initialization
  INIT: [ESC, 0x40],

  // Text formatting
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],

  // Font size
  NORMAL: [ESC, 0x21, 0x00],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_HEIGHT_ON: [GS, 0x21, 0x01],
  DOUBLE_WIDTH_ON: [GS, 0x21, 0x10],
  DOUBLE_SIZE_ON: [GS, 0x21, 0x11],
  NORMAL_SIZE: [GS, 0x21, 0x00],

  // Line spacing
  LINE_SPACING_DEFAULT: [ESC, 0x32],
  LINE_SPACING_SET: [ESC, 0x33],

  // Paper handling
  CUT_PAPER: [GS, 0x56, 0x00],
  CUT_PAPER_PARTIAL: [GS, 0x56, 0x01],

  // Cash drawer
  OPEN_CASH_DRAWER: [ESC, 0x70, 0x00, 0x19, 0xfa],
}

export interface ReceiptData {
  shopName: string
  shopAddress?: string
  shopPhone?: string
  receiptNumber: string
  date: string
  items: ReceiptItem[]
  subtotal: number
  discount: number
  total: number
  paymentMethod: string
  cashierName?: string
  footerMessage?: string
}

export interface ReceiptItem {
  name: string
  quantity: number
  unitPrice: number
  total: number
  variation?: string
}

function textToBytes(text: string): number[] {
  return Array.from(Buffer.from(text, 'utf8'))
}

function centerText(text: string, width: number = 48): string {
  const padding = Math.max(0, Math.floor((width - text.length) / 2))
  return ' '.repeat(padding) + text
}

function formatLine(left: string, right: string, width: number = 48): string {
  const maxLeft = width - right.length
  const leftStr = left.length > maxLeft ? left.substring(0, maxLeft - 3) + '...' : left
  return leftStr.padEnd(maxLeft) + right
}

export async function printReceipt(port: SerialPort, data: ReceiptData): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const commands: number[] = []

      // Initialize printer
      commands.push(...ESC_POS.INIT)

      // Header - Shop Name (centered, double size)
      commands.push(...ESC_POS.ALIGN_CENTER)
      commands.push(...ESC_POS.DOUBLE_SIZE_ON)
      commands.push(...ESC_POS.BOLD_ON)
      commands.push(...textToBytes(data.shopName))
      commands.push(0x0a) // newline
      commands.push(...ESC_POS.NORMAL_SIZE)
      commands.push(...ESC_POS.BOLD_OFF)

      // Shop details
      if (data.shopAddress) {
        commands.push(...textToBytes(data.shopAddress))
        commands.push(0x0a)
      }
      if (data.shopPhone) {
        commands.push(...textToBytes('Tel: ' + data.shopPhone))
        commands.push(0x0a)
      }

      // Separator
      commands.push(...textToBytes('--------------------------------'))
      commands.push(0x0a)

      // Receipt info
      commands.push(...ESC_POS.ALIGN_LEFT)
      commands.push(...textToBytes(formatLine(`No: ${data.receiptNumber}`, `Date: ${data.date}`)))
      commands.push(0x0a)
      if (data.cashierName) {
        commands.push(...textToBytes(formatLine('Cashier:', data.cashierName)))
        commands.push(0x0a)
      }

      // Separator
      commands.push(...textToBytes('--------------------------------'))
      commands.push(0x0a)

      // Items header
      commands.push(...ESC_POS.BOLD_ON)
      commands.push(...textToBytes(formatLine('Item', 'Total')))
      commands.push(0x0a)
      commands.push(...ESC_POS.BOLD_OFF)
      commands.push(...textToBytes('--------------------------------'))
      commands.push(0x0a)

      // Items
      for (const item of data.items) {
        const itemName = item.variation
          ? `${item.name} (${item.variation})`
          : item.name
        const qty = `${item.quantity} x ${item.unitPrice.toFixed(2)}`
        commands.push(...textToBytes(formatLine(itemName, '')))
        commands.push(0x0a)
        commands.push(...textToBytes(formatLine(qty, item.total.toFixed(2))))
        commands.push(0x0a)
      }

      // Separator
      commands.push(...textToBytes('--------------------------------'))
      commands.push(0x0a)

      // Totals
      commands.push(...textToBytes(formatLine('Subtotal:', data.subtotal.toFixed(2))))
      commands.push(0x0a)

      if (data.discount > 0) {
        commands.push(...textToBytes(formatLine('Discount:', '-' + data.discount.toFixed(2))))
        commands.push(0x0a)
      }

      // Total (bold, double height)
      commands.push(...ESC_POS.BOLD_ON)
      commands.push(...ESC_POS.DOUBLE_HEIGHT_ON)
      commands.push(...textToBytes(formatLine('TOTAL:', data.total.toFixed(2))))
      commands.push(0x0a)
      commands.push(...ESC_POS.NORMAL_SIZE)
      commands.push(...ESC_POS.BOLD_OFF)

      // Payment method
      commands.push(...textToBytes(formatLine('Payment:', data.paymentMethod.toUpperCase())))
      commands.push(0x0a)

      // Separator
      commands.push(...textToBytes('--------------------------------'))
      commands.push(0x0a)

      // Footer
      if (data.footerMessage) {
        commands.push(...ESC_POS.ALIGN_CENTER)
        commands.push(...textToBytes(data.footerMessage))
        commands.push(0x0a)
      }

      // Thank you message
      commands.push(...ESC_POS.ALIGN_CENTER)
      commands.push(...textToBytes('Thank you for your purchase!'))
      commands.push(0x0a)
      commands.push(0x0a)
      commands.push(0x0a)

      // Cut paper
      commands.push(...ESC_POS.CUT_PAPER_PARTIAL)

      // Write to port
      const buffer = Buffer.from(commands)
      port.write(buffer, (err) => {
        if (err) {
          log.error('Failed to write to printer:', err)
          reject(err)
        } else {
          resolve()
        }
      })
    } catch (error) {
      log.error('Print error:', error)
      reject(error)
    }
  })
}

export async function testPrintReceipt(port: SerialPort): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const commands: number[] = []

      // Initialize
      commands.push(...ESC_POS.INIT)

      // Test print
      commands.push(...ESC_POS.ALIGN_CENTER)
      commands.push(...ESC_POS.DOUBLE_SIZE_ON)
      commands.push(...ESC_POS.BOLD_ON)
      commands.push(...textToBytes('SOOSTORI POS'))
      commands.push(0x0a)
      commands.push(...ESC_POS.NORMAL_SIZE)
      commands.push(...ESC_POS.BOLD_OFF)

      commands.push(...textToBytes('Printer Test'))
      commands.push(0x0a)
      commands.push(...textToBytes('----------------'))
      commands.push(0x0a)

      commands.push(...ESC_POS.ALIGN_CENTER)
      commands.push(...textToBytes('Test successful!'))
      commands.push(0x0a)
      commands.push(...textToBytes(new Date().toLocaleString()))
      commands.push(0x0a)
      commands.push(0x0a)
      commands.push(0x0a)

      commands.push(...ESC_POS.CUT_PAPER_PARTIAL)

      const buffer = Buffer.from(commands)
      port.write(buffer, (err) => {
        if (err) reject(err)
        else resolve()
      })
    } catch (error) {
      reject(error)
    }
  })
}
