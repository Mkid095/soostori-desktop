import { useLanguage } from './i18n-context'
import type { TranslationKey } from './i18n'

// ============================================================
// HOOK
// ============================================================
export const useTranslation = () => {
  const ctx = useLanguage()
  return {
    t: (key: TranslationKey | string, fallback?: string): string => ctx.t(key, fallback),
    language: ctx.language,
    setLanguage: ctx.setLanguage,
  }
}
