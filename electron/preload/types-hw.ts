// Hardware / receipt domain types
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

export interface UpdateStatusData {
  state: string
  currentVersion: string
  availableVersion?: string
  updateType?: 'ota' | 'binary'
  progress?: {
    downloadedBytes: number
    totalBytes?: number
    bytesPerSecond: number
    percent: number
    etaSeconds: number
  }
  error?: {
    code: string
    message: string
    retryCount?: number
  }
  requiresRestart: boolean
  lastCheckedAt?: string
  installedAt?: string
}
