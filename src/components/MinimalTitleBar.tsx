import React, { useCallback, useEffect, useState } from 'react'
import { Minus, Square, X } from 'lucide-react'

const MinimalTitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    let active = true
    window.electronAPI?.app.isMaximized().then(v => { if (active) setIsMaximized(v) }).catch(() => undefined)
    const unsub = window.electronAPI?.app.onMaximizeChange?.(setIsMaximized)
    return () => { active = false; unsub?.() }
  }, [])

  const minimize = useCallback(() => window.electronAPI?.app.minimize(), [])
  const maximize = useCallback(() => window.electronAPI?.app.maximize(), [])
  const close = useCallback(() => window.electronAPI?.app.close(), [])

  return (
    <header
      className="relative z-[10000] flex h-9 shrink-0 select-none items-center justify-between border-b border-border-color bg-bg-secondary"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-2 px-3">
        <span className="text-[11px] font-black uppercase tracking-widest text-text-muted">
          Soostori POS
        </span>
      </div>
      <div className="flex items-center gap-1 pr-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          type="button"
          onClick={minimize}
          aria-label="Minimize"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <Minus size={13} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={maximize}
          aria-label={isMaximized ? 'Restore' : 'Maximize'}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          {isMaximized
            ? <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="7" height="7" /><path d="M4 2V1h6v6h-1" /></svg>
            : <Square size={11} strokeWidth={2} />
          }
        </button>
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40 dark:hover:text-red-400"
        >
          <X size={13} strokeWidth={2.5} />
        </button>
      </div>
    </header>
  )
}

export default MinimalTitleBar
