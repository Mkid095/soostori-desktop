// Hardware-related types

// Hardware settings stored in electron-store
export interface HardwareSettings {
  scanner: {
    type: 'keyboard' | 'serial'
    serialPort?: string
    baudRate: number
  }
  printer: {
    type: 'escpos' | 'system'
    serialPort?: string
    baudRate: number
  }
}
