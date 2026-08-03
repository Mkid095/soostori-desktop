import log from 'electron-log'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SerialPort: any = null
try {
  const serialport = require('serialport')
  SerialPort = serialport.SerialPort
} catch { /* serialport not available */ }

export interface AutoDetectResult { port: string; baudRate: number }

const BAUD_RATES = [9600, 19200, 38400, 57600, 115200]
const TIMEOUT_MS = 1500

export async function autoDetectSerialScanner(): Promise<AutoDetectResult | null> {
  if (!SerialPort) return null
  try {
    const ports = await SerialPort.list()
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
  let testPort: any = null
  try {
    testPort = new SerialPort({ path: portPath, baudRate, dataBits: 8, parity: 'none', stopBits: 1 })
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)
      const parser = testPort.pipe(new (require('serialport').ReadlineParser)({ delimiter: '\r\n' }))
      const cleanup = () => { clearTimeout(timeout); parser.removeAllListeners('data'); testPort?.removeAllListeners('error') }
      parser.on('data', () => { cleanup(); resolve() })
      testPort.on('error', () => { cleanup(); reject(new Error('port error')) })
    })
    testPort.close(() => {})
    return true
  } catch {
    try { testPort?.close(() => {}) } catch { /* ignore */ }
    return false
  }
}
