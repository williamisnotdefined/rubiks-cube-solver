import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

export const supportedLanguages = [
  'en-US',
  'es',
  'pt-BR',
  'it',
  'de',
  'fr',
  'ru',
  'zh',
  'ja',
] as const
export type SupportedLanguage = (typeof supportedLanguages)[number]
type LocaleModule = { default: typeof import('./locales/en.json') }

export const fallbackLanguage: SupportedLanguage = 'en-US'
export const languageStorageKey = 'rubiks-cube-solver-language'

const localeLoaders: Record<SupportedLanguage, () => Promise<LocaleModule>> = {
  de: () => import('./locales/de.json'),
  'en-US': () => import('./locales/en.json'),
  es: () => import('./locales/es.json'),
  fr: () => import('./locales/fr.json'),
  it: () => import('./locales/it.json'),
  ja: () => import('./locales/ja.json'),
  'pt-BR': () => import('./locales/pt-BR.json'),
  ru: () => import('./locales/ru.json'),
  zh: () => import('./locales/zh.json'),
}

const supportedBaseLanguages: Partial<Record<string, SupportedLanguage>> = {
  de: 'de',
  en: 'en-US',
  es: 'es',
  fr: 'fr',
  it: 'it',
  ja: 'ja',
  ru: 'ru',
  zh: 'zh',
}

export function languageFromBrowser(
  languages: readonly string[] = browserLanguages(),
): SupportedLanguage {
  for (const language of languages) {
    const supportedLanguage = supportedLanguageFromTag(language)
    if (supportedLanguage !== undefined) {
      return supportedLanguage
    }
  }

  return fallbackLanguage
}

export function languageFromRoute(pathname: string = browserPathname()): SupportedLanguage {
  return explicitLanguageFromRoute(pathname) ?? fallbackLanguage
}

function explicitLanguageFromRoute(pathname: string): SupportedLanguage | undefined {
  const firstSegment = pathname.split('/').filter(Boolean)[0]
  const routeLanguages: Partial<Record<string, SupportedLanguage>> = {
    de: 'de',
    en: 'en-US',
    es: 'es',
    fr: 'fr',
    it: 'it',
    ja: 'ja',
    'pt-BR': 'pt-BR',
    ru: 'ru',
    zh: 'zh',
  }

  return firstSegment === undefined ? undefined : routeLanguages[firstSegment]
}

export function initialLanguage(pathname: string = browserPathname()): SupportedLanguage {
  return resolveInitialLanguage(pathname, storedLanguagePreference(), browserLanguages())
}

export function resolveInitialLanguage(
  pathname: string,
  storedLanguage: SupportedLanguage | undefined,
  browserLanguagePreferences: readonly string[],
): SupportedLanguage {
  const routeLanguage = explicitLanguageFromRoute(pathname)
  if (routeLanguage !== undefined) {
    return routeLanguage
  }

  return storedLanguage ?? languageFromBrowser(browserLanguagePreferences)
}

export function storedLanguagePreference(): SupportedLanguage | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  const storedLanguage = window.localStorage.getItem(languageStorageKey)
  return supportedLanguages.find((language) => language === storedLanguage)
}

export function saveLanguagePreference(language: SupportedLanguage): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(languageStorageKey, language)
  }
}

export function clearLanguagePreference(): void {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(languageStorageKey)
  }
}

void i18n.use(initReactI18next).init({
  fallbackLng: fallbackLanguage,
  initAsync: false,
  interpolation: {
    escapeValue: false,
  },
  load: 'currentOnly',
  lng: languageFromRoute(),
  resources: {},
  supportedLngs: supportedLanguages,
})

export default i18n

export async function ensureLanguageResources(language: SupportedLanguage): Promise<void> {
  if (i18n.hasResourceBundle(language, 'translation')) {
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
