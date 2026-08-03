// Re-export shim — translations live in src/lib/i18n/ modules.
// Existing imports of `TranslationKey` / `Language` / `translations` from
// `./i18n` continue to work via this file.
export { translations, t, type Language, type TranslationKey } from './i18n/index'
export { default } from './i18n/index'