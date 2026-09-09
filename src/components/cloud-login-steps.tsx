/**
 * cloud-login-steps.tsx — Step sub-components for CloudLoginScreen.
 * Extracted per ANPAS: UI components must be focused (<150 lines each).
 */

import React from 'react'
import { Mail, CheckCircle, XCircle, RefreshCw, Building2 } from 'lucide-react'
import MinimalTitleBar from './MinimalTitleBar'

// ── Success ────────────────────────────────────────────────────────────────

export function CloudLoginSuccess(): React.ReactElement {
  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      <MinimalTitleBar />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
          <h1 className="text-2xl font-bold text-text-primary">Connected to cloud</h1>
          <p className="text-text-muted mt-2">Syncing your shop data…</p>
        </div>
      </div>
    </div>
  )
}

// ── Error ────────────────────────────────────────────────────────────────

interface CloudLoginErrorProps {
  message: string
  onRetry: () => void
  onOffline: () => void
}

export function CloudLoginError({ message, onRetry, onOffline }: CloudLoginErrorProps): React.ReactElement {
  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      <MinimalTitleBar />
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="bg-bg-secondary rounded-2xl p-8 shadow-2xl w-full max-w-sm text-center border border-border-color">
          <XCircle size={40} className="mx-auto mb-4 text-red-500" />
          <h2 className="text-lg font-bold text-text-primary">Authentication failed</h2>
          <p className="text-sm text-text-muted mt-2">{message}</p>
          <div className="mt-6 flex gap-3">
            <button type="button" onClick={onRetry}
              className="flex-1 px-4 py-2 rounded-xl bg-bg-tertiary text-text-primary hover:bg-bg-tertiary/80 transition-colors text-sm font-semibold border border-border-color">
              Try again
            </button>
            <button type="button" onClick={onOffline}
              className="flex-1 px-4 py-2 rounded-xl bg-brand-orange text-white hover:bg-orange-600 transition-colors text-sm font-semibold">
              Offline mode
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Email step ───────────────────────────────────────────────────────────

interface EmailStepProps {
  email: string
  loading: boolean
  onEmailChange: (v: string) => void
  onSend: () => void
  onOffline: () => void
}

export function EmailStep({ email, loading, onEmailChange, onSend, onOffline }: EmailStepProps): React.ReactElement {
  return (
    <div className="w-full space-y-4">
      <div className="bg-bg-tertiary border border-border-color rounded-xl p-4 text-center">
        <p className="text-text-secondary text-sm">Enter your email to receive a magic code.</p>
      </div>
      <div className="relative">
        <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input type="email" value={email} onChange={e => onEmailChange(e.target.value)}
          placeholder="you@yourshop.com"
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-bg-tertiary border border-border-color text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-orange transition-colors"
          onKeyDown={e => e.key === 'Enter' && onSend()} />
      </div>
      <button type="button" onClick={onSend} disabled={loading || !email.includes('@')}
        className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-orange text-white font-semibold hover:bg-orange-600 transition-all disabled:opacity-50">
        {loading ? <RefreshCw size={16} className="animate-spin" /> : <Mail size={16} />}
        Send Magic Code
      </button>
      <button type="button" onClick={onOffline}
        className="text-xs text-text-muted hover:text-text-secondary transition-colors">
        Setup offline? Use the local wizard instead
      </button>
    </div>
  )
}

// ── Code step ────────────────────────────────────────────────────────────

interface CodeStepProps {
  email: string
  code: string
  loading: boolean
  onCodeChange: (v: string) => void
  onVerify: () => void
  onBack: () => void
}

export function CodeStep({ email, code, loading, onCodeChange, onVerify, onBack }: CodeStepProps): React.ReactElement {
  return (
    <div className="w-full space-y-4">
      <p className="text-center text-sm text-text-muted">
        Code sent to <span className="text-text-primary font-semibold">{email}</span>
      </p>
      <input type="text" maxLength={6} value={code}
        onChange={e => onCodeChange(e.target.value.replace(/\D/g, ''))}
        placeholder="Enter 6-digit code" autoFocus
        className="w-full text-center text-3xl tracking-[0.5em] font-bold py-3 rounded-xl bg-bg-tertiary border border-border-color text-text-primary placeholder-text-muted focus:outline-none focus:border-brand-orange transition-colors"
        onKeyDown={e => e.key === 'Enter' && onVerify()} />
      <button type="button" onClick={onVerify} disabled={loading || code.length !== 6}
        className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-orange text-white font-semibold hover:bg-orange-600 transition-all disabled:opacity-50">
        {loading ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle size={16} />}
        Verify &amp; Sign In
      </button>
      <button type="button" onClick={onBack}
        className="text-sm text-text-muted hover:text-text-secondary transition-colors">
        ← Back to email
      </button>
    </div>
  )
}

// ── Header ─────────────────────────────────────────────────────────────────

export function CloudLoginHeader(): React.ReactElement {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-14 h-14 rounded-2xl bg-brand-orange flex items-center justify-center shadow-lg shadow-orange-500/30">
        <Building2 size={28} className="text-white" />
      </div>
      <h1 className="text-2xl font-bold text-text-primary tracking-tight">Soostori POS</h1>
      <p className="text-text-muted text-sm">Sign in to your shop</p>
    </div>
  )
}
