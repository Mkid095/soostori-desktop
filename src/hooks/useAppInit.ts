/**
 * useAppInit.ts — App startup logic extracted from App.tsx per ANPAS:
 * UI components must NOT contain business logic.
 */

import { useEffect, useState } from 'react'
import { api } from '../lib/api'

interface UseAppInitReturn {
  shopExists: boolean | null
  cloudAuthStep: 'none' | 'logging-in' | 'logged-in'
  pendingCloudAuth: { shopId: string; userId: string; deviceId: string } | null
  setCloudAuthStep: (s: 'none' | 'logging-in' | 'logged-in') => void
  setPendingCloudAuth: (v: { shopId: string; userId: string; deviceId: string } | null) => void
  setShopExists: (v: boolean) => void
}

export function useAppInit(): UseAppInitReturn {
  const [shopExists, setShopExists] = useState<boolean | null>(null)
  const [cloudAuthStep, setCloudAuthStep] = useState<'none' | 'logging-in' | 'logged-in'>('none')
  const [pendingCloudAuth, setPendingCloudAuth] = useState<{ shopId: string; userId: string; deviceId: string } | null>(null)

  useEffect(() => {
    async function init() {
      const cloud = window.electronAPI?.cloudAuth
      if (cloud) {
        try {
          const restored = await cloud.restoreSession()
          if (restored.restored) {
            setCloudAuthStep('logged-in')
            const shop = await api.getShop()
            setShopExists(!!shop)
            return
          }
        } catch (err) {
          // Cloud unavailable or session restore failed — fall through to local auth
          console.warn('[useAppInit] Cloud session restore failed:', err)
        }
      }
      api.getShop().then(shop => {
        setShopExists(!!shop)
      }).catch(() => setShopExists(false))
    }
    init()
  }, [])

  return { shopExists, cloudAuthStep, pendingCloudAuth, setCloudAuthStep, setPendingCloudAuth, setShopExists }
}
