/**
 * useCommissions.ts — Renderer hook for fetching salesperson commission data from cloud.
 * Uses the instant-self MCP via the cloud:pullCommissions IPC.
 */

import { useState, useEffect, useCallback } from 'react'
import type { ElectronAPI } from '../../electron/preload/types'
import type { SalespersonPackage } from '../../electron/preload/ipc-signatures-hw'

interface UseCommissionsResult {
  packages: SalespersonPackage[]
  loading: boolean
  error: string | null
  refetch: (salespersonProfileId: string) => Promise<void>
}

export function useCommissions(salespersonProfileId: string | null): UseCommissionsResult {
  const [packages, setPackages] = useState<SalespersonPackage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch_ = useCallback(async (profileId: string) => {
    if (!profileId) return
    setLoading(true)
    setError(null)
    try {
      const cloud = (window.electronAPI as ElectronAPI)?.cloud
      if (!cloud) throw new Error('Cloud API not available')
      const result = await cloud.pullCommissions(profileId)
      if (result.success) {
        setPackages(result.packages ?? [])
      } else {
        setError(result.error ?? 'Unknown error')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (salespersonProfileId) {
      fetch_(salespersonProfileId)
    }
  }, [salespersonProfileId, fetch_])

  return { packages, loading, error, refetch: fetch_ }
}
