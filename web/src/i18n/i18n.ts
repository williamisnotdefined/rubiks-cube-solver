import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import ptBr from './locales/pt-BR.json'

export const supportedLanguages = ['en', 'es', 'pt-BR', 'it', 'de', 'fr', 'ru', 'zh', 'ja'] as const
export type SupportedLanguage = (typeof supportedLanguages)[number]
type StaticLanguage = 'en' | 'pt-BR'
type DynamicLanguage = Exclude<SupportedLanguage, StaticLanguage>
type LocaleModule = { default: typeof en }

export const fallbackLanguage: SupportedLanguage = 'en'

const localeLoaders: Record<DynamicLanguage, () => Promise<LocaleModule>> = {
  de: () => import('./locales/de.json'),
  es: () => import('./locales/es.json'),
  fr: () => import('./locales/fr.json'),
  it: () => import('./locales/it.json'),
  ja: () => import('./locales/ja.json'),
  ru: () => import('./locales/ru.json'),
  zh: () => import('./locales/zh.json'),
}

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

void i18n.use(initReactI18next).init({
  fallbackLng: fallbackLanguage,
  initAsync: false,
  interpolation: {
    escapeValue: false,
  },
  lng: languageFromRoute(),
  resources: {
    en: { translation: en },
    'pt-BR': { translation: ptBr },
  },
  supportedLngs: supportedLanguages,
})

export default i18n

export async function ensureLanguageResources(language: SupportedLanguage): Promise<void> {
  if (i18n.hasResourceBundle(language, 'translation')) {
    return
  }

  if (language === 'en' || language === 'pt-BR') {
    return
  }

  const locale = await localeLoaders[language]()
  if (!i18n.hasResourceBundle(language, 'translation')) {
    i18n.addResourceBundle(language, 'translation', locale.default, true, true)
  }
}

export async function changeLanguage(language: SupportedLanguage): Promise<void> {
  await ensureLanguageResources(language)
  await i18n.changeLanguage(language)
}

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
