/**
 * useCloudSync.ts — Renderer hook for cloud sync operations.
 * Delegates to the electronAPI.cloud IPC bridge.
 */

import { useState, useEffect, useCallback } from 'react'
import type { ElectronAPI } from '../../electron/preload/types'

interface CloudHealth {
  reachable: boolean
  latencyMs: number | null
}

interface SubscriptionInfo {
  valid: boolean
  plan: string | null
  deviceLimit: number | null
  expiryDate: string | null
}

export function useCloudSync() {
  const [health, setHealth] = useState<CloudHealth>({ reachable: false, latencyMs: null })
  const [subscription, setSubscription] = useState<SubscriptionInfo>({
    valid: true, plan: null, deviceLimit: null, expiryDate: null
  })
  const [syncing, setSyncing] = useState(false)
  const [lastPushed, setLastPushed] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Check connectivity on mount
  useEffect(() => {
    checkHealth()
    fetchSubscription()
  }, [])

  const checkHealth = useCallback(async () => {
    const cloud = (window.electronAPI as ElectronAPI)?.cloud
    if (!cloud) return
    try {
      const h = await cloud.health()
      setHealth(h)
    } catch {
      setHealth({ reachable: false, latencyMs: null })
    }
  }, [])

  const fetchSubscription = useCallback(async () => {
    const cloud = (window.electronAPI as ElectronAPI)?.cloud
    if (!cloud) return
    try {
      const sub = await cloud.subscription()
      setSubscription(sub)
    } catch {
      // subscription check failed — stay in trial mode
    }
  }, [])

  const pushEvents = useCallback(async (): Promise<number> => {
    const cloud = (window.electronAPI as ElectronAPI)?.cloud
    if (!cloud) throw new Error('Cloud API not available')
    setSyncing(true)
    setError(null)
    try {
      const result = await cloud.syncEvents()
      setLastPushed(result.pushed)
      return result.pushed
    } catch (err) {
      setError(String(err))
      throw err
    } finally {
      setSyncing(false)
    }
  }, [])

  const pullSettings = useCallback(async () => {
    const cloud = (window.electronAPI as ElectronAPI)?.cloud
    if (!cloud) throw new Error('Cloud API not available')
    setSyncing(true)
    setError(null)
    try {
      const result = await cloud.pullShopSettings()
      if (!result.success) throw new Error(result.error ?? 'Pull failed')
      return result
    } catch (err) {
      setError(String(err))
      throw err
    } finally {
      setSyncing(false)
    }
  }, [])

  const syncShopSettings = useCallback(async () => {
    const cloud = (window.electronAPI as ElectronAPI)?.cloud
    if (!cloud) throw new Error('Cloud API not available')
    setSyncing(true)
    setError(null)
    try {
      const result = await cloud.syncShopSettings()
      if (!result.success) throw new Error(result.error ?? 'Sync failed')
      return result
    } catch (err) {
      setError(String(err))
      throw err
    } finally {
      setSyncing(false)
    }
  }, [])

  const fullSync = useCallback(async () => {
    const cloud = (window.electronAPI as ElectronAPI)?.cloud
    if (!cloud) throw new Error('Cloud API not available')
    setSyncing(true)
    setError(null)
    try {
      await cloud.fullSync()
    } catch (err) {
      setError(String(err))
      throw err
    } finally {
      setSyncing(false)
    }
  }, [])

  return { health, subscription, syncing, lastPushed, error, checkHealth, fetchSubscription, pushEvents, pullSettings, syncShopSettings, fullSync }
}
