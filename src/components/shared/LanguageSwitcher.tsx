import React, { useEffect, useRef, useState } from 'react'
import { Globe } from 'lucide-react'
import { useLanguage } from '../../lib/i18n-context'
import { useTranslation } from '../../lib/useTranslation'

const LanguageSwitcher: React.FC = () => {
  const { t } = useTranslation()
  const { language, setLanguage } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const closeOnOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setIsOpen(false) }
    document.addEventListener('mousedown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => { document.removeEventListener('mousedown', closeOnOutside); document.removeEventListener('keydown', closeOnEscape) }
  }, [isOpen])

  const languageLabel = language === 'en' ? 'English' : 'Kiswahili'

  return (
    <div ref={containerRef} className="relative flex items-center">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`${t('app.currentLanguage')} ${languageLabel}. Click to switch.`}
        className="flex h-8 items-center gap-1.5 rounded-full border border-border-color bg-bg-tertiary px-2 text-slate-400 transition-all duration-200 hover:bg-orange-50 hover:text-brand-orange dark:hover:bg-slate-800"
      >
        <Globe size={13} />
        <span className="text-[10px] font-black uppercase tracking-wider">{language === 'en' ? 'EN' : 'SW'}</span>
      </button>
      {isOpen && (
        <div className="absolute right-0 top-9 z-[10000] w-36 overflow-hidden rounded-xl border border-border-color bg-bg-secondary shadow-xl animate-fade-in">
          <div className="border-b border-border-color px-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{t('app.currentLanguage')}</p>
          </div>
          <button
            type="button"
            onClick={() => { setLanguage('en'); setIsOpen(false) }}
            className="flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">English</span>
            {language === 'en' && <span className="h-1.5 w-1.5 rounded-full bg-brand-orange" />}
          </button>
          <button
            type="button"
            onClick={() => { setLanguage('sw'); setIsOpen(false) }}
            className="flex w-full items-center justify-between border-t border-border-color px-3 py-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Kiswahili</span>
            {language === 'sw' && <span className="h-1.5 w-1.5 rounded-full bg-brand-orange" />}
          </button>
        </div>
      )}
    </div>
  )
}

export default LanguageSwitcher
