import React, { useCallback, useEffect, useState } from 'react'
import { AlertCircle, ArrowUpCircle, Download, RefreshCw } from 'lucide-react'
import type { UpdateStatusData } from '../lib/types/api'
import { useTranslation } from '../lib/useTranslation'

type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'not-available' | 'error' | 'dev-mode'

const UpdateIndicator: React.FC = () => {
  const { t } = useTranslation()
  const [status, setStatus] = useState<UpdateStatus>('idle')
  const [version, setVersion] = useState('')
  const [progress, setProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  const applyStatus = useCallback((data: UpdateStatusData) => {
    const nextStatus = data.status as UpdateStatus
    setStatus(nextStatus)
    if (data.version) setVersion(data.version)
    if (typeof data.percent === 'number') setProgress(data.percent)
    if (data.message) setErrorMessage(data.message)
  }, [])

  useEffect(() => {
    const updater = window.electronAPI?.updater
    if (!updater) return
    let active = true
    updater.status().then((data) => { if (active) applyStatus(data) }).catch(() => undefined)
    const unsubscribe = updater.onStatus(applyStatus)
    return () => { active = false; unsubscribe?.() }
  }, [applyStatus])

  const checkForUpdates = useCallback(() => {
    const updater = window.electronAPI?.updater
    if (!updater) return
    setStatus('checking')
    updater.check().then(applyStatus).catch((error: unknown) => {
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : t('app.unableCheckUpdates'))
    })
  }, [applyStatus, t])

  const downloadUpdate = useCallback(() => {
    window.electronAPI?.updater?.download().catch(() => {
      setStatus('error')
      setErrorMessage(t('app.unableDownloadUpdate'))
    })
  }, [t])

  if (status === 'idle' || status === 'not-available' || status === 'dev-mode') {
    return <button type="button" onClick={checkForUpdates} aria-label={t('app.checkUpdates')} title={t('app.checkUpdates')} className="flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-bold text-slate-500 transition-all duration-200 hover:bg-orange-50 hover:text-brand-orange"><RefreshCw size={13} /><span>{t('app.checkUpdates')}</span></button>
  }

  if (status === 'checking') {
    return <div role="status" aria-label={t('app.checkingForUpdates')} className="flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-bold text-blue-600"><RefreshCw size={13} className="animate-spin" /><span>{t('app.updating')}</span></div>
  }

  if (status === 'available') {
    return <button type="button" onClick={downloadUpdate} aria-label={`${t('app.downloadUpdate')} ${version}`} title={`${t('app.versionAvailableTitle')} ${version}`} className="flex h-7 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 text-[10px] font-bold text-emerald-700 transition-all duration-200 hover:bg-emerald-100 animate-pulse"><ArrowUpCircle size={13} /><span>Update {version || 'available'}</span></button>
  }

  if (status === 'downloading') {
    return <div role="status" aria-label={`${t('app.downloading')} ${Math.round(progress)}%`} className="flex h-7 items-center gap-1.5 rounded-full bg-blue-50 px-2.5 text-[10px] font-bold text-blue-700"><Download size={13} /><div className="h-1.5 w-12 overflow-hidden rounded-full bg-blue-100"><div className="h-full rounded-full bg-blue-500 transition-all duration-200" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} /></div><span>{t('app.downloading')} {Math.round(progress)}%</span></div>
  }

  if (status === 'ready') {
    return <button type="button" onClick={() => window.electronAPI?.updater?.install()} aria-label={t('app.restartToUpdate')} title={t('app.restartToUpdate')} className="flex h-7 items-center gap-1.5 rounded-full bg-orange-500 px-2.5 text-[10px] font-bold text-white transition-all duration-200 hover:bg-orange-600"><RefreshCw size={13} /><span>{t('app.restartToUpdateLabel')}</span></button>
  }

  return <button type="button" onClick={checkForUpdates} aria-label={t('app.updateFailedRetry')} title={errorMessage || t('app.updateFailed')} className="flex h-7 items-center gap-1.5 rounded-full bg-red-50 px-2.5 text-[10px] font-bold text-red-700 transition-all duration-200 hover:bg-red-100"><AlertCircle size={13} /><span>{t('action.retry')}</span></button>
}

export default UpdateIndicator
