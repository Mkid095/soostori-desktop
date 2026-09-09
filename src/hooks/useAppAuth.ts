/**
 * useAppAuth.ts — Auth handlers extracted from App.tsx per ANPAS.
 * Receives the useAppInit state setters so it can update cloud auth state.
 */

import { useCallback } from 'react'
import type { ShopUser } from '../../electron/preload/types'

interface UseAppAuthOptions {
  cloudAuthStep: 'none' | 'logging-in' | 'logged-in'
  pendingCloudAuth: { shopId: string; userId: string; deviceId: string } | null
  setCloudAuthStep: (s: 'none' | 'logging-in' | 'logged-in') => void
  setPendingCloudAuth: (v: { shopId: string; userId: string; deviceId: string } | null) => void
  setShopExists: (v: boolean) => void
  onLoginComplete: (user: ShopUser, sid: string, deviceId: string) => void
}

export function useAppAuth({
  cloudAuthStep, pendingCloudAuth,
  setCloudAuthStep, setPendingCloudAuth, setShopExists,
  onLoginComplete,
}: UseAppAuthOptions) {
  const handleCloudLoginComplete = useCallback((shopId: string, userId: string, deviceId: string) => {
    setCloudAuthStep('logged-in')
    setPendingCloudAuth({ shopId, userId, deviceId })
    setShopExists(true)
  }, [setCloudAuthStep, setPendingCloudAuth, setShopExists])

  const handleLogin = useCallback((user: ShopUser, sid: string, deviceId: string) => {
    window.electronAPI.db.getDeviceId().then(({ deviceId: canonicalId }) => {
      localStorage.setItem('deviceId', canonicalId)
      return window.electronAPI.db.registerDevice({
        deviceId: canonicalId, shopId: user.shop_id,
        deviceName: deviceId, employeeId: user.id,
      }).then(dev => {
        onLoginComplete(user, sid, dev?.id ?? canonicalId)
      })
    }).catch(() => {
      onLoginComplete(user, sid, deviceId)
    })
  }, [onLoginComplete])

  return { handleCloudLoginComplete, handleLogin }
}
