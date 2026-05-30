import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import es from './locales/es.json'
import ptBr from './locales/pt-BR.json'

export type SupportedLanguage = 'en' | 'es' | 'pt-BR'

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
    en: { translation: en },
    es: { translation: es },
    'pt-BR': { translation: ptBr },
  },
  supportedLngs: ['en', 'es', 'pt-BR'],
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
  const normalized = language.toLowerCase()

  if (normalized === 'pt-br' || normalized.startsWith('pt-')) {
    return 'pt-BR'
  }

  if (normalized === 'es' || normalized.startsWith('es-')) {
    return 'es'
  }

  if (normalized === 'en' || normalized.startsWith('en-')) {
    return 'en'
  }

  return undefined
}
