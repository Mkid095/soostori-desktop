/**
 * DesktopUpdateManager — implements @soostori/updates UpdateManager over electron-updater.
 * Wraps electron-updater behind the canonical SDK interface.
 * POS safety is enforced before install.
 */

import { app } from 'electron'
import { autoUpdater, UpdateInfo } from 'electron-updater'
import log from 'electron-log'
import { getDatabase } from './database'
import type { ISO8601 } from '@soostori/core'
import type {
  UpdateManager,
  UpdateStatus,
  UpdateAvailableInfo,
  UpdateProgress,
  UpdateState,
  SemVer,
} from '@soostori/updates'

// ── State machine ──────────────────────────────────────────────────────────────

type Listener = (status: UpdateStatus) => void
let _state: UpdateState = 'CURRENT'
let _status: UpdateStatus = makeStatus('CURRENT')
const _listeners = new Set<Listener>()

function makeStatus(s: UpdateState, p?: Partial<UpdateStatus>): UpdateStatus {
  return { state: s, currentVersion: app.getVersion() as SemVer,
    requiresRestart: false, lastCheckedAt: null, installedAt: null, ...p }
}

function emit(next: UpdateState, p?: Partial<UpdateStatus>): void {
  _state = next; _status = makeStatus(next, p)
  log.info(`[UpdateMgr] ${next}`)
  _listeners.forEach(cb => { try { cb(_status) } catch { /* noop */ } })
}

// ── electron-updater event wiring ───────────────────────────────────────────────

autoUpdater.logger = log
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

autoUpdater.on('checking-for-update', () => emit('CHECKING'))
autoUpdater.on('update-available', (i: UpdateInfo) =>
  emit('UPDATE_AVAILABLE', { availableVersion: i.version as SemVer, updateType: 'binary',
    requiresRestart: true, lastCheckedAt: new Date().toISOString() as ISO8601 }))
autoUpdater.on('update-not-available', () => emit('CURRENT', { lastCheckedAt: new Date().toISOString() as ISO8601 }))
autoUpdater.on('download-progress', (p) => {
  if (_state !== 'DOWNLOADING') emit('DOWNLOADING')
  _status = { ..._status, progress: { downloadedBytes: p.transferred, totalBytes: p.total,
    bytesPerSecond: p.bytesPerSecond, percent: p.percent, etaSeconds: Infinity } }
  _listeners.forEach(cb => { try { cb(_status) } catch { /* noop */ } })
})
autoUpdater.on('update-downloaded', (i: UpdateInfo) =>
  emit('READY_TO_INSTALL', { availableVersion: i.version as SemVer, requiresRestart: true }))
autoUpdater.on('error', (e: Error) => {
  const code = e.message.toLowerCase().includes('network') ? 'CHECK_FAILED'
    : e.message.toLowerCase().includes('checksum') ? 'CHECKSUM_MISMATCH'
    : e.message.toLowerCase().includes('signature') ? 'SIGNATURE_INVALID' : 'UNKNOWN'
  emit('ERROR', { error: { code, message: e.message, retryCount: 0 } })
})

// ── UpdateManager ─────────────────────────────────────────────────────────────

export class DesktopUpdateManager implements UpdateManager {
  private _checking = false
  private _lastInfo: UpdateAvailableInfo | null = null

  async getCurrentVersion(): Promise<SemVer> { return app.getVersion() as SemVer }

  async checkForUpdate(): Promise<UpdateAvailableInfo | null> {
    if (this._checking) return null
    if (process.env.NODE_ENV === 'development') { emit('CURRENT'); return null }
    this._checking = true; emit('CHECKING')
    try {
      const result = await autoUpdater.checkForUpdates()
      this._checking = false
      if (!result?.updateInfo) { emit('CURRENT', { lastCheckedAt: new Date().toISOString() as ISO8601 }); return null }
      const info = result.updateInfo
      this._lastInfo = { version: info.version as SemVer, updateType: 'binary',
        releaseNotes: info.releaseNotes ? (typeof info.releaseNotes === 'string' ? info.releaseNotes
          : Array.isArray(info.releaseNotes) ? info.releaseNotes.map((n: any) => n.note).join('\n') : undefined) : undefined,
        releasedAt: (info.releaseDate ?? new Date().toISOString()) as ISO8601,
        mandatory: (info as any).mandatory ?? false }
      emit('UPDATE_AVAILABLE', { availableVersion: this._lastInfo.version,
        updateType: 'binary', requiresRestart: true, lastCheckedAt: new Date().toISOString() as ISO8601 })
      if (this._lastInfo.mandatory) autoUpdater.downloadUpdate().catch(() => {})
      return this._lastInfo
    } catch (err) {
      this._checking = false
      emit('ERROR', { error: { code: 'CHECK_FAILED', message: (err as Error).message, retryCount: 0 } })
      return null
    }
  }

  async downloadUpdate(onProgress?: (p: UpdateProgress) => void): Promise<void> {
    if (_state !== 'UPDATE_AVAILABLE' && _state !== 'DOWNLOADING')
      throw new Error(`downloadUpdate called in invalid state: ${_state}`)
    emit('DOWNLOADING')
    if (onProgress) autoUpdater.once('download-progress', p => onProgress({
      downloadedBytes: p.transferred, totalBytes: p.total,
      bytesPerSecond: p.bytesPerSecond, percent: p.percent, etaSeconds: Infinity }))
    try { await autoUpdater.downloadUpdate() } catch (err) {
      emit('ERROR', { error: { code: 'DOWNLOAD_FAILED', message: (err as Error).message, retryCount: 0 } })
      throw err
    }
  }

  async installUpdate(): Promise<void> {
    const pending = getDatabase().prepare("SELECT id FROM sales WHERE status = 'pending' LIMIT 1").get()
    if (pending) {
      const msg = 'Cannot install update: active sale in progress'
      emit('ERROR', { error: { code: 'UNKNOWN', message: msg, retryCount: 0 } })
      throw new Error(msg)
    }
    emit('INSTALLING')
    autoUpdater.quitAndInstall(false, true)
  }

  async abort(): Promise<void> {
    log.warn('[UpdateMgr] abort — electron-updater has no cancel API')
    emit('ERROR', { error: { code: 'USER_CANCELLED', message: 'Update cancelled', retryCount: 0 } })
  }

  async getStatus(): Promise<UpdateStatus> { return _status }
  addListener(cb: Listener): () => void { _listeners.add(cb); return () => _listeners.delete(cb) }
}

export const desktopUpdateManager = new DesktopUpdateManager()
