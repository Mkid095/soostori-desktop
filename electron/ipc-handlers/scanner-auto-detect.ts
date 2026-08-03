import log from 'electron-log'
import type { SerialPort, SerialPortInstance } from '../../src/types/serialport.d'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const serialport = require('serialport') as { SerialPort: SerialPort }
const SerialPortClass = serialport.SerialPort

export interface AutoDetectResult { port: string; baudRate: number }

const BAUD_RATES = [9600, 19200, 38400, 57600, 115200]
const TIMEOUT_MS = 1500

export async function autoDetectSerialScanner(): Promise<AutoDetectResult | null> {
  try {
    const ports = await SerialPortClass.list()
    if (ports.length === 0) return null
    for (const portInfo of ports) {
      const portPath = String(portInfo.path)
      for (const baudRate of BAUD_RATES) {
        const found = await tryPortBaud(portPath, baudRate)
        if (found) {
          log.info(`Auto-detected scanner on ${portPath} at ${baudRate} baud`)
          return { port: portPath, baudRate }
        }
      }
    }
    return null
  } catch (error) {
    log.error('Auto-detect failed:', error)
    return null
  }
}

async function tryPortBaud(portPath: string, baudRate: number): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ReadlineParserCtor = (require('serialport') as { ReadlineParser: new (o: { delimiter: string }) => any }).ReadlineParser
  let testPort: SerialPortInstance | null = null
  try {
    const port: SerialPortInstance = new SerialPortClass({ path: portPath, baudRate, dataBits: 8, parity: 'none', stopBits: 1 })
    testPort = port
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parser: any = port.pipe(new ReadlineParserCtor({ delimiter: '\r\n' }))
      const cleanup = () => { clearTimeout(timeout); parser.removeAllListeners('data'); port.removeAllListeners('error') }
      parser.on('data', () => { cleanup(); resolve() })
      port.on('error', () => { cleanup(); reject(new Error('port error')) })
    })
    port.close(() => {})
    return true
  } catch {
    try { testPort?.close(() => {}) } catch { /* ignore */ }
    return false
  }
}
