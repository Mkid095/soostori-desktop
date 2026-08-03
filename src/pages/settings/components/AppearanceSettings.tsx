import React, { useState, useEffect } from 'react'
import { Palette, Globe } from 'lucide-react'
import { useTheme } from '../../../lib/theme-context'
import { useLanguage } from '../../../lib/i18n-context'

interface AppearanceSettingsProps {
  onClose: () => void
}

const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({ onClose }) => {
  const { theme, setTheme } = useTheme()
  const { language, setLanguage } = useLanguage()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // Load current defaults from DB
    window.electronAPI.db.getAppSettingsDefaults().then(defaults => {
      if (defaults.defaultTheme && defaults.defaultTheme !== theme) setTheme(defaults.defaultTheme)
      if (defaults.defaultLanguage && defaults.defaultLanguage !== language) setLanguage(defaults.defaultLanguage)
    })
  }, [])

  const handleThemeChange = async (newTheme: 'light' | 'dark') => {
    setSaving(true)
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    await window.electronAPI.db.setDefaultTheme(newTheme)
    setSaving(false)
  }

  const handleLanguageChange = async (newLang: 'en' | 'sw') => {
    setSaving(true)
    setLanguage(newLang)
    localStorage.setItem('language', newLang)
    await window.electronAPI.db.setDefaultLanguage(newLang)
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      {/* Default Theme */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Palette size={16} className="text-brand-orange" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Default Theme</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleThemeChange('light')}
            className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-all ${
              theme === 'light'
                ? 'border-brand-orange bg-orange-50 dark:bg-orange-950/40 text-brand-orange'
                : 'border-slate-200 dark:border-slate-600 text-slate-500 hover:border-slate-300'
            }`}
          >
            Light
          </button>
          <button
            onClick={() => handleThemeChange('dark')}
            className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-all ${
              theme === 'dark'
                ? 'border-brand-orange bg-orange-50 dark:bg-orange-950/40 text-brand-orange'
                : 'border-slate-200 dark:border-slate-600 text-slate-500 hover:border-slate-300'
            }`}
          >
            Dark
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2">Applied to all screens when app starts</p>
      </div>

      {/* Default Language */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Globe size={16} className="text-brand-orange" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Default Language</span>
        </div>
        <select
          value={language}
          onChange={e => handleLanguageChange(e.target.value as 'en' | 'sw')}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
        >
          <option value="en">English</option>
          <option value="sw">Kiswahili</option>
        </select>
        <p className="text-xs text-slate-400 mt-2">Applied when app launches for the first time</p>
      </div>

      {/* PIN Settings */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
        <p className="text-xs text-slate-400">PIN management available on the login screen.</p>
      </div>
    </div>
  )
}

export default AppearanceSettings
