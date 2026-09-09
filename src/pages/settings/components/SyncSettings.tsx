import React, { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Wifi, WifiOff, Globe } from 'lucide-react'
import { useTranslation } from '../../../lib/useTranslation'

export default function SyncSettings() {
  const { t } = useTranslation()
  const [mode, setMode] = useState<'host' | 'client' | 'offline'>('offline')
  const [hostUrl, setHostUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const loadMode = useCallback(async () => {
    const r = await window.electronAPI.db.syncGetMode()
    setMode((r as { mode: 'host' | 'client' | 'offline' }).mode)
  }, [])

  useEffect(() => { loadMode() }, [loadMode])

  const startHost = async () => {
    setLoading(true); setErr('')
    try {
      await window.electronAPI.db.syncStartHost(18792)
      setMode('host')
    } catch (e) { setErr((e as Error).message) }
    finally { setLoading(false) }
  }

  const connectClient = async () => {
    if (!hostUrl.trim()) { setErr('Enter host IP:port'); return }
    setLoading(true); setErr('')
    try {
      await window.electronAPI.db.syncStartClient(hostUrl.trim())
      setMode('client')
    } catch (e) { setErr((e as Error).message) }
    finally { setLoading(false) }
  }

  const disconnect = async () => {
    setLoading(true)
    try { await window.electronAPI.db.syncStop(); setMode('offline') }
    finally { setLoading(false) }
  }

  const Icon = mode === 'offline' ? WifiOff : Wifi

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Icon size={16} className={mode === 'offline' ? 'text-slate-400' : 'text-green-600'} />
        <h2 className="text-sm font-bold">LAN Sync</h2>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${mode === 'offline' ? 'bg-slate-100 text-slate-500' : 'bg-green-50 text-green-600'}`}>
          {mode === 'host' ? 'Host' : mode === 'client' ? 'Connected' : 'Offline'}
        </span>
      </div>

      {err && <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">{err}</p>}

      {mode === 'offline' && (
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Run as Shop Host</p>
            <p className="text-xs text-slate-400">This device becomes the LAN server. Other tills connect to it.</p>
            <button onClick={startHost} disabled={loading}
              className="w-full py-2 rounded-xl bg-brand-orange text-white text-xs font-semibold hover:bg-orange-600 disabled:opacity-50">
              {loading ? 'Starting...' : 'Start as Host'}
            </button>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Connect to Host</p>
            <p className="text-xs text-slate-400">Join an existing shop LAN.</p>
            <input value={hostUrl} onChange={e => setHostUrl(e.target.value)}
              placeholder="192.168.1.100:18792"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs" />
            <button onClick={connectClient} disabled={loading}
              className="w-full py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </div>
      )}

      {mode !== 'offline' && (
        <div className="space-y-2">
          <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 text-xs">
            {mode === 'host' ? (
              <p className="text-green-700 dark:text-green-300">This device is the <strong>Shop Host</strong>.<br />Other tills can connect to your LAN IP.</p>
            ) : (
              <p className="text-green-700 dark:text-green-300">Connected to LAN shop host.<br />All sales sync in real-time.</p>
            )}
          </div>
          <button onClick={disconnect} disabled={loading}
            className="w-full py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700">
            Disconnect
          </button>
        </div>
      )}
    </div>
  )
}
