import { SerialPort } from 'serialport'
import { ESC_POS, textToBytes } from './esc-commands'

export async function testPrintReceipt(port: SerialPort): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const commands: number[] = []
      commands.push(...ESC_POS.INIT, ...ESC_POS.ALIGN_CENTER, ...ESC_POS.DOUBLE_SIZE_ON, ...ESC_POS.BOLD_ON)
      commands.push(...textToBytes('SOOSTORI POS'), 0x0a)
      commands.push(...ESC_POS.NORMAL_SIZE, ...ESC_POS.BOLD_OFF)
      commands.push(...textToBytes('Printer Test'), 0x0a)
      commands.push(...textToBytes('----------------'), 0x0a)
      commands.push(...ESC_POS.ALIGN_CENTER, ...textToBytes('Test successful!'), 0x0a)
      commands.push(...textToBytes(new Date().toLocaleString()), 0x0a, 0x0a, 0x0a)
      commands.push(...ESC_POS.CUT_PAPER_PARTIAL)
      const buffer = Buffer.from(commands)
      port.write(buffer, err => { if (err) reject(err); else resolve() })
    } catch (error) { reject(error) }
  })
}
