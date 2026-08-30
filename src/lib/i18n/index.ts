import { nav } from './nav'
import { pos } from './pos'
import { inv } from './inv'
import { invPricing } from './inv-pricing'
import { rep } from './rep'
import { deb } from './deb'
import { set } from './set'
import { setHw } from './set-hw'
import { shared } from './shared'
import { app } from './app'
import { exp } from './expenses'

// ============================================================
// TYPES
// ============================================================
export type Language = 'en' | 'sw'

// ============================================================
// TRANSLATIONS RECORD
// ============================================================
export const translations = {
  en: { ...nav.en, ...pos.en, ...inv.en, ...invPricing.en, ...rep.en, ...deb.en, ...set.en, ...setHw.en, ...shared.en, ...app.en, ...exp.en },
  sw: { ...nav.sw, ...pos.sw, ...inv.sw, ...invPricing.sw, ...rep.sw, ...deb.sw, ...set.sw, ...setHw.sw, ...shared.sw, ...app.sw, ...exp.sw },
} as const

export type TranslationKey = keyof typeof translations.en

// ============================================================
// CURRENT LANGUAGE RESOLUTION
// ============================================================
function resolveLanguage(lang: Language | string | undefined | null): Language {
  if (lang === 'en' || lang === 'sw') return lang
  return 'en'
}

// ============================================================
// INTERPOLATION
// ============================================================
function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : `{${key}}`,
  )
}

// ============================================================
// TRANSLATE FUNCTION (non-hook)
// ============================================================
export function t(key: TranslationKey, params?: Record<string, string | number>, language?: Language): string {
  const lang = resolveLanguage(language)
  const value = translations[lang][key] ?? translations.en[key] ?? key
  return interpolate(value, params)
}

export default t