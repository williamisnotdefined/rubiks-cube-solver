import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import de from './locales/de.json'
import en from './locales/en.json'
import es from './locales/es.json'
import fr from './locales/fr.json'
import it from './locales/it.json'
import ja from './locales/ja.json'
import ptBr from './locales/pt-BR.json'
import ru from './locales/ru.json'
import zh from './locales/zh.json'

export const supportedLanguages = ['en', 'es', 'pt-BR', 'it', 'de', 'fr', 'ru', 'zh', 'ja'] as const
export type SupportedLanguage = (typeof supportedLanguages)[number]

export const fallbackLanguage: SupportedLanguage = 'en'

export function languageFromBrowser(languages: readonly string[] = browserLanguages()): SupportedLanguage {
  for (const language of languages) {
    const supportedLanguage = supportedLanguageFromTag(language)
    if (supportedLanguage !== undefined) {
      return supportedLanguage
    }
  }

  return fallbackLanguage
}

i18n.use(initReactI18next).init({
  fallbackLng: fallbackLanguage,
  initAsync: false,
  interpolation: {
    escapeValue: false,
  },
  lng: languageFromBrowser(),
  resources: {
    de: { translation: de },
    en: { translation: en },
    es: { translation: es },
    fr: { translation: fr },
    it: { translation: it },
    ja: { translation: ja },
    'pt-BR': { translation: ptBr },
    ru: { translation: ru },
    zh: { translation: zh },
  },
  supportedLngs: supportedLanguages,
})

export default i18n

function browserLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') {
    return [fallbackLanguage]
  }

  if (navigator.languages.length > 0) {
    return navigator.languages
  }

  return [navigator.language]
}

function supportedLanguageFromTag(language: string): SupportedLanguage | undefined {
  const normalized = language.toLowerCase().replace('_', '-')
  const baseLanguage = normalized.split('-')[0]

  if (normalized === 'pt-br' || normalized.startsWith('pt-')) {
    return 'pt-BR'
  }

  if (baseLanguage === 'es') {
    return 'es'
  }

  if (baseLanguage === 'en') {
    return 'en'
  }

  if (baseLanguage === 'it') {
    return 'it'
  }

  if (baseLanguage === 'de') {
    return 'de'
  }

  if (baseLanguage === 'fr') {
    return 'fr'
  }

  if (baseLanguage === 'ru') {
    return 'ru'
  }

  if (baseLanguage === 'zh') {
    return 'zh'
  }

  if (baseLanguage === 'ja') {
    return 'ja'
  }

  return undefined
}
