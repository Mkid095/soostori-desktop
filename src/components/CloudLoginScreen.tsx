/**
 * CloudLoginScreen.tsx — Production onboarding: cloud authentication flow.
 *
 * Two steps:
 *   1. Owner/manager logs in with email magic code
 *   2. After login, selects or creates shop, registers device
 *
 * Falls back to local setup wizard if cloud is unavailable.
 */

import React, { useState, useCallback } from 'react'
import { Mail, CheckCircle, XCircle, RefreshCw, Building2 } from 'lucide-react'
import { useTranslation } from '../lib/useTranslation'
import type { ElectronAPI } from '../../electron/preload/types'

type Step = 'email' | 'code' | 'register' | 'success' | 'error'

interface CloudLoginProps {
  onComplete: (shopId: string, userId: string, deviceId: string) => void
  fallbackToSetup: () => void
}

const CloudLoginScreen: React.FC<CloudLoginProps> = ({ onComplete, fallbackToSetup }) => {
  const { t } = useTranslation()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [deviceName] = useState(`POS-${navigator.userAgent.match(/Windows|Mac|Linux/)?.[0] ?? 'Desktop'}-${Date.now().toString(36)}`)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [attemptCount, setAttemptCount] = useState(0)

  const api = window.electronAPI?.cloudAuth

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
        // Register device and sync shop/employees
        const regResult = await api.registerDevice({
          email,
          deviceId: localStorage.getItem('deviceId') ?? '',
          deviceName,
          cloudUser: result.session,
          employeeId: '',
          employeeName: email.split('@')[0],
        })
        if (regResult.success) {
          setStep('success')
          // Extract shop info from session
          const session = regResult.session as Record<string, unknown>
          const shopId = String(session.shopId ?? '')
          const userId = String(session.userId ?? '')
          const deviceId = localStorage.getItem('deviceId') ?? ''
          setTimeout(() => onComplete(shopId, userId, deviceId), 800)
        } else {
          setErrorMsg(regResult.error ?? 'Registration failed')
          setStep('error')
        }
      } else {
        setAttemptCount(a => a + 1)
        setErrorMsg(result.error ?? 'Invalid code')
        setStep('error')
      }
    } catch { setErrorMsg('Verification failed'); setStep('error') }
    finally { setLoading(false) }
  }, [api, email, code, deviceName, onComplete])

  const reset = () => { setStep('email'); setEmail(''); setCode(''); setErrorMsg(''); setAttemptCount(0) }

  if (step === 'success') return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900">
      <div className="text-center text-white">
        <CheckCircle size={48} className="mx-auto mb-4 text-green-400" />
        <h1 className="text-2xl font-bold">Connected to cloud</h1>
        <p className="text-slate-400 mt-2">Syncing your shop data…</p>
      </div>
    </div>
  )

  if (step === 'error') return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900">
      <div className="bg-slate-800 rounded-2xl p-8 shadow-2xl w-full max-w-sm text-center">
        <XCircle size={40} className="mx-auto mb-4 text-red-400" />
        <h2 className="text-lg font-bold text-white">Authentication failed</h2>
        <p className="text-sm text-slate-400 mt-2">{errorMsg}</p>
        <div className="mt-6 flex gap-3">
          <button onClick={reset} className="flex-1 px-4 py-2 rounded-xl bg-slate-700 text-white hover:bg-slate-600 transition-colors text-sm font-semibold">Try again</button>
          <button onClick={fallbackToSetup} className="flex-1 px-4 py-2 rounded-xl bg-brand-orange text-white hover:bg-orange-600 transition-colors text-sm font-semibold">Offline mode</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="w-full max-w-sm px-6 flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-brand-orange flex items-center justify-center shadow-lg shadow-orange-500/30">
            <Building2 size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Soostori POS</h1>
          <p className="text-slate-400 text-sm">Sign in to your shop</p>
        </div>

        {step === 'email' && (
          <div className="w-full space-y-4">
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-center">
              <p className="text-slate-300 text-sm">Enter your email to receive a magic code.</p>
            </div>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@yourshop.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-700 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-brand-orange transition-colors"
                onKeyDown={e => e.key === 'Enter' && requestCode()}
              />
            </div>
            <button
              onClick={requestCode}
              disabled={loading || !email.includes('@')}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-orange text-white font-semibold hover:bg-orange-600 transition-all disabled:opacity-50"
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <Mail size={16} />}
              Send Magic Code
            </button>
            <button onClick={fallbackToSetup} className="text-xs text-slate-500 hover:text-slate-400 transition-colors">
              Setup offline? Use the local wizard instead
            </button>
          </div>
        )}

        {step === 'code' && (
          <div className="w-full space-y-4">
            <p className="text-center text-sm text-slate-400">
              Code sent to <span className="text-white font-semibold">{email}</span>
            </p>
            <input
              type="text"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 6-digit code"
              autoFocus
              className="w-full text-center text-3xl tracking-[0.5em] font-bold py-3 rounded-xl bg-slate-700 border border-slate-600 text-white placeholder-slate-600 focus:outline-none focus:border-brand-orange transition-colors"
              onKeyDown={e => e.key === 'Enter' && verifyCode()}
            />
            <button
              onClick={verifyCode}
              disabled={loading || code.length !== 6}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-orange text-white font-semibold hover:bg-orange-600 transition-all disabled:opacity-50"
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              Verify & Sign In
            </button>
            <button onClick={reset} className="text-sm text-slate-500 hover:text-slate-400 transition-colors">
              ← Back to email
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default CloudLoginScreen
