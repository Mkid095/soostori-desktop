// API-related types

// API result wrapper
export interface ApiResult<T> {
  data?: T
  error?: string
}

// Canonical SDK update status — mirrors @soostori/updates UpdateStatus
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
