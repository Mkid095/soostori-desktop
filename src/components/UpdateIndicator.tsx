/**
 * UpdateIndicator — renders the current SDK update state.
 * Maps canonical @soostori/updates states to UI sub-components.
 * Sub-components extracted to update-indicator-states.tsx per ANPAS.
 */

import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from '../lib/useTranslation'
import type { UpdateStatusData } from '../../electron/preload/types-hw'
import {
  UpdateIndicatorIdle, UpdateIndicatorChecking, UpdateIndicatorAvailable,
  UpdateIndicatorDownloading, UpdateIndicatorReady, UpdateIndicatorInstalling,
  UpdateIndicatorError,
} from './update-indicator-states'

type UiState = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'installing' | 'error'

function sdkStateToUi(data: UpdateStatusData): UiState {
  switch (data.state) {
    case 'CURRENT': return 'idle'
    case 'CHECKING': return 'checking'
    case 'UPDATE_AVAILABLE': return 'available'
    case 'DOWNLOADING': return 'downloading'
    case 'READY_TO_INSTALL': return 'ready'
    case 'INSTALLING': return 'installing'
    case 'ERROR': return 'error'
    default: return 'idle'
  }
}

const UpdateIndicator: React.FC = () => {
  const { t } = useTranslation()
  const [uiState, setUiState] = useState<UiState>('idle')
  const [availableVersion, setAvailableVersion] = useState('')
  const [progress, setProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  const applyStatus = useCallback((data: UpdateStatusData) => {
    setUiState(sdkStateToUi(data))
    setAvailableVersion(data.availableVersion ?? '')
    if (data.progress?.percent !== undefined) setProgress(data.progress.percent)
    if (data.error?.message) setErrorMessage(data.error.message)
  }, [])

  useEffect(() => {
    const updater = window.electronAPI?.updater
    if (!updater) return
    let active = true
    updater.status().then(d => { if (active) applyStatus(d) }).catch(() => undefined)
    const unsub = updater.onStatus(applyStatus)
    return () => { active = false; unsub?.() }
  }, [applyStatus])

  const checkForUpdates = useCallback(() => {
    const updater = window.electronAPI?.updater
    if (!updater) return
    setUiState('checking')
    updater.check().then(applyStatus).catch((err: unknown) => {
      setUiState('error')
      setErrorMessage(err instanceof Error ? err.message : t('app.unableCheckUpdates'))
    })
  }, [applyStatus, t])

  const downloadUpdate = useCallback(() => {
    window.electronAPI?.updater?.download().catch((err: unknown) => {
      setUiState('error')
      setErrorMessage(err instanceof Error ? err.message : t('app.unableDownloadUpdate'))
    })
  }, [t])

  const installUpdate = useCallback(() => {
    window.electronAPI?.updater?.install().then(result => {
      if (result?.blocked) { setUiState('error'); setErrorMessage(t('app.updateBlockedSale') || 'Please complete the current sale first') }
    }).catch(() => {})
  }, [t])

  if (uiState === 'idle') return <UpdateIndicatorIdle onCheck={checkForUpdates} t={t} />
  if (uiState === 'checking') return <UpdateIndicatorChecking t={t} />
  if (uiState === 'available') return <UpdateIndicatorAvailable version={availableVersion} onDownload={downloadUpdate} t={t} />
  if (uiState === 'downloading') return <UpdateIndicatorDownloading progress={progress} t={t} />
  if (uiState === 'ready') return <UpdateIndicatorReady onInstall={installUpdate} t={t} />
  if (uiState === 'installing') return <UpdateIndicatorInstalling t={t} />
  return <UpdateIndicatorError message={errorMessage} onRetry={checkForUpdates} t={t} />
}

export default UpdateIndicator
