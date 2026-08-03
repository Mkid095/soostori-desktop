import { useLanguage } from './i18n-context'
import type { TranslationKey } from './i18n'

// ============================================================
// HOOK
// ============================================================
export const useTranslation = () => {
  const ctx = useLanguage()
  return {
    t: (key: TranslationKey): string => ctx.t(key),
    language: ctx.language,
    setLanguage: ctx.setLanguage,
  }
}
