import React, { useCallback, useEffect, useState } from 'react'
import { Copy, Globe, Minus, Moon, Settings, Square, Sun, X } from 'lucide-react'
import NotificationsDropdown from './shared/NotificationsDropdown'
import SyncIndicator from './SyncIndicator'
import UpdateIndicator from './UpdateIndicator'
import { useTheme } from '../lib/theme-context'
import { useLanguage } from '../lib/i18n-context'

interface WindowButtonProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  variant?: 'default' | 'close'
}

const WindowButton: React.FC<WindowButtonProps> = ({ icon, label, onClick, variant = 'default' }) => (
  <button type="button" onClick={onClick} aria-label={label} title={label} className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 ${variant === 'close' ? 'text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40 dark:hover:text-red-400' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200'}`}>
    {icon}
  </button>
)

const TitleBar: React.FC<{ onSettingsClick: () => void }> = ({ onSettingsClick }) => {
  const [isMaximized, setIsMaximized] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const { language, setLanguage } = useLanguage()

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'en' ? 'sw' : 'en')
  }, [language, setLanguage])

  useEffect(() => {
    let active = true
    window.electronAPI?.app.isMaximized().then((value) => { if (active) setIsMaximized(value) }).catch(() => undefined)
    const unsubscribe = window.electronAPI?.app.onMaximizeChange?.(setIsMaximized)
    return () => { active = false; unsubscribe?.() }
  }, [])

  const minimize = useCallback(() => window.electronAPI?.app.minimize(), [])
  const maximize = useCallback(() => window.electronAPI?.app.maximize(), [])
  const close = useCallback(() => window.electronAPI?.app.close(), [])

  return (
    <header className="relative z-[10000] flex h-9 shrink-0 select-none items-center justify-between border-b border-border-color bg-bg-secondary transition-colors duration-200" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
      <div className="flex items-center gap-2 px-3"><span className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Soostori POS</span></div>
      <div className="flex items-center gap-1 pr-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <div className="flex items-center gap-0.5 rounded-full border border-border-color bg-bg-tertiary px-1">
          <SyncIndicator />
          <span className="h-4 w-px bg-border-color" aria-hidden="true" />
          <NotificationsDropdown />
          <span className="h-4 w-px bg-border-color" aria-hidden="true" />
          <UpdateIndicator />
        </div>
        <button type="button" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all duration-200 hover:bg-orange-50 hover:text-brand-orange dark:hover:bg-slate-800">{theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}</button>
        <button type="button" onClick={toggleLanguage} aria-label={`Switch to ${language === 'en' ? 'Swahili' : 'English'}`} title={`Switch to ${language === 'en' ? 'Swahili' : 'English'}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all duration-200 hover:bg-orange-50 hover:text-brand-orange dark:hover:bg-slate-800">
          <Globe size={14} />
        </button>
        <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full border border-border-color bg-bg-tertiary px-1 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{language === 'en' ? 'EN' : 'SW'}</span>
        <button type="button" onClick={onSettingsClick} aria-label="Open settings" title="Settings" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all duration-200 hover:bg-orange-50 hover:text-brand-orange dark:hover:bg-slate-800"><Settings size={14} /></button>
        <span className="mx-1 h-4 w-px bg-border-color" aria-hidden="true" />
        <WindowButton icon={<Minus size={13} strokeWidth={2.5} />} label="Minimize" onClick={minimize} />
        <WindowButton icon={isMaximized ? <Copy size={11} strokeWidth={2} /> : <Square size={11} strokeWidth={2} />} label={isMaximized ? 'Restore window' : 'Maximize window'} onClick={maximize} />
        <WindowButton icon={<X size={13} strokeWidth={2.5} />} label="Close" onClick={close} variant="close" />
      </div>
    </header>
  )
}

export default TitleBar
