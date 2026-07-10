import { BR, CN, DE, ES, FR, IT, JP, RU, US } from 'country-flag-icons/react/3x2'
import { Languages } from 'lucide-react'
import { startTransition } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router'
import { Button } from '@components/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@components/DropdownMenu'
import {
  changeLanguage,
  clearLanguagePreference,
  languageFromBrowser,
  saveLanguagePreference,
  storedLanguagePreference,
  type SupportedLanguage,
} from '@src/i18n/i18n'
import { localizedPath, type SeoLocale } from '@src/seo/routes'

type LanguageSelectorProps = {
  locale: SeoLocale
  pagePath: string
  onNavigate?: () => void
}

type LanguageOption = {
  flag: typeof US
  label: string
  language: SupportedLanguage
}

const automaticLanguageValue = 'automatic'

const languageOptions: Record<SupportedLanguage, LanguageOption> = {
  de: { flag: DE, label: 'Deutsch (Deutschland)', language: 'de' },
  'en-US': { flag: US, label: 'English (United States)', language: 'en-US' },
  es: { flag: ES, label: 'Español (España)', language: 'es' },
  fr: { flag: FR, label: 'Français (France)', language: 'fr' },
  it: { flag: IT, label: 'Italiano (Italia)', language: 'it' },
  ja: { flag: JP, label: '日本語 (日本)', language: 'ja' },
  'pt-BR': { flag: BR, label: 'Português (Brasil)', language: 'pt-BR' },
  ru: { flag: RU, label: 'Русский (Россия)', language: 'ru' },
  zh: { flag: CN, label: '简体中文 (中国)', language: 'zh' },
}

const orderedLanguages: readonly SupportedLanguage[] = ['en-US', 'pt-BR', 'es', 'it', 'de', 'fr', 'ru', 'zh', 'ja']

export function LanguageSelector({ locale, pagePath, onNavigate }: LanguageSelectorProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const currentOption = languageOptions[locale]
  const CurrentFlag = currentOption.flag
  const automaticLanguage = languageFromBrowser()
  const automaticLabel = t('navigation.languageAutomatic', {
    language: languageOptions[automaticLanguage].label,
  })
  const selectedPreference = storedLanguagePreference() ?? automaticLanguageValue

  async function selectLanguage(value: string) {
    let language: SupportedLanguage

    if (value === automaticLanguageValue) {
      clearLanguagePreference()
      language = languageFromBrowser()
    } else {
      language = value as SupportedLanguage
      saveLanguagePreference(language)
    }

    await changeLanguage(language)

    startTransition(() => {
      navigate(
        {
          hash: location.hash,
          pathname: localizedPath(pagePath, language),
          search: location.search,
        },
        { replace: true },
      )
      onNavigate?.()
    })
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={t('navigation.language')}
          className="w-full justify-start gap-2"
          type="button"
          variant="ghost"
        >
          <Languages aria-hidden="true" className="size-4" />
          <span className="flex-1 text-start">{t('navigation.language')}</span>
          <CurrentFlag aria-hidden="true" className="size-auto h-4 w-6 shrink-0 shadow-xs" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64" side="top">
        <DropdownMenuRadioGroup value={selectedPreference} onValueChange={(value) => void selectLanguage(value)}>
          <DropdownMenuRadioItem value={automaticLanguageValue}>
            <Languages aria-hidden="true" className="size-4 shrink-0" />
            <span>{automaticLabel}</span>
          </DropdownMenuRadioItem>
          {orderedLanguages.map((language) => {
            const option = languageOptions[language]
            const Flag = option.flag

            return (
              <DropdownMenuRadioItem key={option.language} value={option.language}>
                <Flag aria-hidden="true" className="size-auto h-4 w-6 shrink-0 shadow-xs" />
                <span>{option.label}</span>
              </DropdownMenuRadioItem>
            )
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
