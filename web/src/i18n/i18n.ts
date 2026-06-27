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

const supportedBaseLanguages: Partial<Record<string, SupportedLanguage>> = {
  de: 'de',
  en: 'en',
  es: 'es',
  fr: 'fr',
  it: 'it',
  ja: 'ja',
  ru: 'ru',
  zh: 'zh',
}

export function languageFromBrowser(languages: readonly string[] = browserLanguages()): SupportedLanguage {
  for (const language of languages) {
    const supportedLanguage = supportedLanguageFromTag(language)
    if (supportedLanguage !== undefined) {
      return supportedLanguage
    }
  }

  return fallbackLanguage
}

export function languageFromRoute(pathname: string = browserPathname()): SupportedLanguage {
  const firstSegment = pathname.split('/').filter(Boolean)[0]
  const routeLanguages: Partial<Record<string, SupportedLanguage>> = {
    de: 'de',
    en: 'en',
    es: 'es',
    fr: 'fr',
    it: 'it',
    ja: 'ja',
    ru: 'ru',
    zh: 'zh',
  }

  return firstSegment === undefined ? 'pt-BR' : routeLanguages[firstSegment] ?? 'pt-BR'
}

i18n.use(initReactI18next).init({
  fallbackLng: fallbackLanguage,
  initAsync: false,
  interpolation: {
    escapeValue: false,
  },
  lng: languageFromRoute(),
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

function browserPathname(): string {
  if (typeof window === 'undefined') {
    return '/'
  }

  return window.location.pathname
}

function supportedLanguageFromTag(language: string): SupportedLanguage | undefined {
  const normalized = language.toLowerCase().replace('_', '-')
  const baseLanguage = normalized.split('-')[0]

  if (normalized === 'pt-br' || normalized.startsWith('pt-')) {
    return 'pt-BR'
  }

  return supportedBaseLanguages[baseLanguage]
}
