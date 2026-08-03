// API-related types

// API result wrapper
export interface ApiResult<T> {
  data?: T
  error?: string
}

// Extend window.electronAPI with updater (for renderer process)
// The actual type is declared in electron/preload.ts and re-exported here
export interface UpdateStatusData {
  status: string
  version?: string
  message?: string
  releaseNotes?: string
  percent?: number
  bytesPerSecond?: number
  transferred?: number
  total?: number
}
