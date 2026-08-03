import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { translations, type Language, type TranslationKey } from './i18n'

// ============================================================
// CONTEXT
// ============================================================
interface LanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: TranslationKey) => string
}

export const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  setLanguage: () => {},
  t: () => '',
})

// ============================================================
// STORAGE
// ============================================================
const STORAGE_KEY = 'language'

function readStoredLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'sw') return stored
  } catch {
    // localStorage unavailable
  }
  return 'en'
}

// ============================================================
// PROVIDER
// ============================================================
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(readStoredLanguage)

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('lang', language)
    try {
      localStorage.setItem(STORAGE_KEY, language)
    } catch {
      // localStorage unavailable
    }
  }, [language])

  const setLanguage = (lang: Language) => setLanguageState(lang)

  const t = (key: TranslationKey): string => {
    return (translations[language] as Record<TranslationKey, string>)[key] ?? (translations['en'] as Record<TranslationKey, string>)[key] ?? key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

// ============================================================
// HOOK
// ============================================================
export const useLanguage = (): LanguageContextValue => useContext(LanguageContext)
