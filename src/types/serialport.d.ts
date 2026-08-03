// Type declarations for serialport (used by electron main process).
// The serialport package ships no TypeScript declarations, so we declare
// only what we actually use in the handlers, using `any` for the
// constructor type to keep the implementation flexible.

export interface PortInfo {
  path: string
  manufacturer?: string
  serialNumber?: string
  pnpId?: string
  locationId?: string
  vendorId?: string
  productId?: string
}

// The constructor — uses `any` so new SerialPort(opts) never fails
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SerialPortConstructor = any

export interface SerialPortInstance {
  isOpen: boolean
  open(): Promise<void>
  close(cb?: () => void): void | Promise<void>
  write(data: string | Buffer, cb?: (err: Error | null) => void): void | Promise<void>
  on(event: string, listener: (...args: unknown[]) => void): this
  pipe<T extends object>(stream: T): T
  removeAllListeners(event?: string): this
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SerialPort = any
