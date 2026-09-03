/**
 * SyncIndicator.tsx — Shows cloud sync status in the title bar area.
 * Reads from DOM custom events dispatched by the main process.
 */

import { useState, useEffect } from 'react'
import type { ElectronAPI } from '../../../electron/preload/types'

type CloudStatus = 'connected' | 'connecting' | 'offline'

const SyncIndicator: React.FC = () => {
  const [status, setStatus] = useState<CloudStatus>('offline')
  const [lastPushed, setLastPushed] = useState<number | null>(null)

  useEffect(() => {
    const cloud = (window.electronAPI as ElectronAPI)?.cloud
    if (!cloud) return

    let cancelled = false
    async function init() {
      try {
        const h = await cloud.health()
        if (!cancelled) setStatus(h.reachable ? 'connected' : 'offline')
        if (h.reachable) {
          // Fire an initial push
          const r = await cloud.syncEvents()
          if (!cancelled) setLastPushed(r.pushed)
        }
      } catch {
        if (!cancelled) setStatus('offline')
      }
    }
    init()

    // Re-check every 30s
    const timer = setInterval(init, 30_000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [])

  const color = status === 'connected' ? 'text-green-400' : status === 'connecting' ? 'text-yellow-400' : 'text-slate-500'
  const label = status === 'connected' ? 'Synced' : status === 'connecting' ? 'Syncing…' : 'Offline'
  const dot = status === 'connected' ? '●' : status === 'connecting' ? '◐' : '○'

  return (
    <span className={`flex items-center gap-1 text-[10px] font-medium ${color} select-none`}>
      <span>{dot}</span>
      {label}
      {lastPushed !== null && lastPushed > 0 && (
        <span className="text-slate-500">({lastPushed})</span>
      )}
    </span>
  )
}

export default SyncIndicator
