/**
 * UpdateIndicatorStates — sub-components per UI state.
 * Extracted per ANPAS: UI components must be focused (<150 lines each).
 */

import React from 'react'
import { AlertCircle, ArrowUpCircle, Download, RefreshCw } from 'lucide-react'
import type { UpdateStatusData } from '../../electron/preload/types-hw'

type UiState = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'installing' | 'error'

interface UpdateIndicatorStatesProps {
  uiState: UiState
  availableVersion: string
  progress: number
  errorMessage: string
  onCheck: () => void
  onDownload: () => void
  onInstall: () => void
  t: (key: string) => string
}

export function UpdateIndicatorIdle({ onCheck, t }: { onCheck: () => void; t: (k: string) => string }): React.ReactElement {
  return (
    <button type="button" onClick={onCheck} aria-label={t('app.checkUpdates')} title={t('app.checkUpdates')}
      className="flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-bold text-slate-500 transition-all duration-200 hover:bg-orange-50 hover:text-brand-orange">
      <RefreshCw size={13} /><span>{t('app.checkUpdates')}</span>
    </button>
  )
}

export function UpdateIndicatorChecking({ t }: { t: (k: string) => string }): React.ReactElement {
  return (
    <div role="status" aria-label={t('app.checkingForUpdates')}
      className="flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-bold text-blue-600">
      <RefreshCw size={13} className="animate-spin" /><span>{t('app.updating')}</span>
    </div>
  )
}

export function UpdateIndicatorAvailable({ version, onDownload, t }: { version: string; onDownload: () => void; t: (k: string) => string }): React.ReactElement {
  return (
    <button type="button" onClick={onDownload}
      aria-label={`${t('app.downloadUpdate')} ${version}`} title={`${t('app.versionAvailableTitle')} ${version}`}
      className="flex h-7 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 text-[10px] font-bold text-emerald-700 transition-all duration-200 hover:bg-emerald-100 animate-pulse">
      <ArrowUpCircle size={13} /><span>Update {version || 'available'}</span>
    </button>
  )
}

export function UpdateIndicatorDownloading({ progress, t }: { progress: number; t: (k: string) => string }): React.ReactElement {
  return (
    <div role="status" aria-label={`${t('app.downloading')} ${Math.round(progress)}%`}
      className="flex h-7 items-center gap-1.5 rounded-full bg-blue-50 px-2.5 text-[10px] font-bold text-blue-700">
      <Download size={13} />
      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-blue-100">
        <div className="h-full rounded-full bg-blue-500 transition-all duration-200"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
      </div>
      <span>{t('app.downloading')} {Math.round(progress)}%</span>
    </div>
  )
}

export function UpdateIndicatorReady({ onInstall, t }: { onInstall: () => void; t: (k: string) => string }): React.ReactElement {
  return (
    <button type="button" onClick={onInstall}
      aria-label={t('app.restartToUpdate')} title={t('app.restartToUpdate')}
      className="flex h-7 items-center gap-1.5 rounded-full bg-orange-500 px-2.5 text-[10px] font-bold text-white transition-all duration-200 hover:bg-orange-600">
      <RefreshCw size={13} /><span>{t('app.restartToUpdateLabel')}</span>
    </button>
  )
}

export function UpdateIndicatorInstalling({ t }: { t: (k: string) => string }): React.ReactElement {
  return (
    <div role="status" aria-label={t('app.installing')}
      className="flex h-7 items-center gap-1.5 rounded-full bg-orange-100 px-2.5 text-[10px] font-bold text-orange-700">
      <RefreshCw size={13} className="animate-spin" /><span>{t('app.installing')}</span>
    </div>
  )
}

export function UpdateIndicatorError({ message, onRetry, t }: { message: string; onRetry: () => void; t: (k: string) => string }): React.ReactElement {
  return (
    <button type="button" onClick={onRetry} aria-label={t('app.updateFailedRetry')} title={message || t('app.updateFailed')}
      className="flex h-7 items-center gap-1.5 rounded-full bg-red-50 px-2.5 text-[10px] font-bold text-red-700 transition-all duration-200 hover:bg-red-100">
      <AlertCircle size={13} /><span>{t('action.retry')}</span>
    </button>
  )
}
