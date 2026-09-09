/**
 * useCloudLogin.ts — Cloud login step machine.
 * Business logic extracted from CloudLoginScreen.tsx per ANPAS:
 * UI components must NOT contain business logic.
 */

import { useState, useCallback } from 'react'
import type { ElectronAPI } from '../../electron/preload/types'

export type LoginStep = 'email' | 'code' | 'register' | 'success' | 'error'

export interface UseCloudLoginOptions {
  onComplete: (shopId: string, userId: string, deviceId: string) => void
  fallbackToSetup: () => void
}

export interface UseCloudLoginReturn {
  step: LoginStep
  email: string
  code: string
  deviceName: string
  loading: boolean
  errorMsg: string
  attemptCount: number
  api: ElectronAPI['cloudAuth'] | undefined
  setEmail: (v: string) => void
  setCode: (v: string) => void
  requestCode: () => Promise<void>
  verifyCode: () => Promise<void>
  reset: () => void
}

export function useCloudLogin({ onComplete, fallbackToSetup }: UseCloudLoginOptions): UseCloudLoginReturn {
  const api = window.electronAPI?.cloudAuth
  const [step, setStep] = useState<LoginStep>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [deviceName] = useState(
    `POS-${navigator.userAgent.match(/Windows|Mac|Linux/)?.[0] ?? 'Desktop'}-${Date.now().toString(36)}`,
  )
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [attemptCount, setAttemptCount] = useState(0)

  const requestCode = useCallback(async () => {
    if (!api || !email || !email.includes('@')) return
    setLoading(true); setErrorMsg('')
    try {
      const result = await api.requestMagicCode(email)
      if (result.codeSent) setStep('code')
      else { setErrorMsg(result.message || 'Failed to send code'); setStep('error') }
    } catch { setErrorMsg('Network error'); setStep('error') }
    finally { setLoading(false) }
  }, [api, email])

  const verifyCode = useCallback(async () => {
    if (!api || code.length !== 6) return
    setLoading(true); setErrorMsg('')
    try {
      const result = await api.verifyMagicCode(email, code)
      if (result.success && result.session) {
        const regResult = await api.registerDevice({
          email, deviceId: localStorage.getItem('deviceId') ?? '',
          deviceName, cloudUser: result.session, employeeId: '',
          employeeName: email.split('@')[0],
        })
        if (regResult.success) {
          setStep('success')
          // registerDevice returns { success, shop, employeeCount, snapshot }
          // shop.id is the cloud shop ID to pass to onComplete
          const shopId = (regResult as unknown as { shop?: { id: string } }).shop?.id ?? ''
          const userId = String(result.session?.userId ?? '')
          setTimeout(() => onComplete(shopId, userId, localStorage.getItem('deviceId') ?? ''), 800)
        } else {
          setErrorMsg(regResult.error ?? 'Registration failed'); setStep('error')
        }
      } else {
        setAttemptCount(a => a + 1)
        setErrorMsg(result.error ?? 'Invalid code'); setStep('error')
      }
    } catch { setErrorMsg('Verification failed'); setStep('error') }
    finally { setLoading(false) }
  }, [api, email, code, deviceName, onComplete])

  const reset = () => { setStep('email'); setEmail(''); setCode(''); setErrorMsg(''); setAttemptCount(0) }

  return { step, email, code, deviceName, loading, errorMsg, attemptCount, api,
    setEmail, setCode, requestCode, verifyCode, reset }
}
