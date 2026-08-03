import { SerialPort } from 'serialport'
import log from 'electron-log'
import { ESC_POS, textToBytes, formatLine } from './esc-commands'

export interface ReceiptData {
  shopName: string; shopAddress?: string; shopPhone?: string
  receiptNumber: string; date: string; items: ReceiptItem[]
  subtotal: number; discount: number; total: number
  paymentMethod: string; cashierName?: string; footerMessage?: string
}
export interface ReceiptItem { name: string; quantity: number; unitPrice: number; total: number; variation?: string }

export async function printReceipt(port: SerialPort, data: ReceiptData): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const commands: number[] = []
      commands.push(...ESC_POS.INIT)
      commands.push(...ESC_POS.ALIGN_CENTER, ...ESC_POS.DOUBLE_SIZE_ON, ...ESC_POS.BOLD_ON)
      commands.push(...textToBytes(data.shopName), 0x0a)
      commands.push(...ESC_POS.NORMAL_SIZE, ...ESC_POS.BOLD_OFF)
      if (data.shopAddress) commands.push(...textToBytes(data.shopAddress), 0x0a)
      if (data.shopPhone) commands.push(...textToBytes('Tel: ' + data.shopPhone), 0x0a)
      commands.push(...textToBytes('--------------------------------'), 0x0a)
      commands.push(...ESC_POS.ALIGN_LEFT)
      commands.push(...textToBytes(formatLine(`No: ${data.receiptNumber}`, `Date: ${data.date}`)), 0x0a)
      if (data.cashierName) commands.push(...textToBytes(formatLine('Cashier:', data.cashierName)), 0x0a)
      commands.push(...textToBytes('--------------------------------'), 0x0a)
      commands.push(...ESC_POS.BOLD_ON)
      commands.push(...textToBytes(formatLine('Item', 'Total')), 0x0a, ...ESC_POS.BOLD_OFF)
      commands.push(...textToBytes('--------------------------------'), 0x0a)
      for (const item of data.items) {
        const name = item.variation ? `${item.name} (${item.variation})` : item.name
        const qty = `${item.quantity} x ${item.unitPrice.toFixed(2)}`
        commands.push(...textToBytes(formatLine(name, '')), 0x0a)
        commands.push(...textToBytes(formatLine(qty, item.total.toFixed(2))), 0x0a)
      }
      commands.push(...textToBytes('--------------------------------'), 0x0a)
      commands.push(...textToBytes(formatLine('Subtotal:', data.subtotal.toFixed(2))), 0x0a)
      if (data.discount > 0) commands.push(...textToBytes(formatLine('Discount:', '-' + data.discount.toFixed(2))), 0x0a)
      commands.push(...ESC_POS.BOLD_ON, ...ESC_POS.DOUBLE_HEIGHT_ON)
      commands.push(...textToBytes(formatLine('TOTAL:', data.total.toFixed(2))), 0x0a)
      commands.push(...ESC_POS.NORMAL_SIZE, ...ESC_POS.BOLD_OFF)
      commands.push(...textToBytes(formatLine('Payment:', data.paymentMethod.toUpperCase())), 0x0a)
      commands.push(...textToBytes('--------------------------------'), 0x0a)
      if (data.footerMessage) { commands.push(...ESC_POS.ALIGN_CENTER, ...textToBytes(data.footerMessage), 0x0a) }
      commands.push(...ESC_POS.ALIGN_CENTER, ...textToBytes('Thank you for your purchase!'), 0x0a, 0x0a, 0x0a)
      commands.push(...ESC_POS.CUT_PAPER_PARTIAL)
      const buffer = Buffer.from(commands)
      port.write(buffer, err => { if (err) { log.error('Print write error:', err); reject(err) } else resolve() })
    } catch (error) { log.error('Print error:', error); reject(error) }
  })
}
