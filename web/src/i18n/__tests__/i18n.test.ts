import { describe, expect, it } from 'vitest'
import i18n, { fallbackLanguage, languageFromBrowser, supportedLanguages } from '../i18n'

describe('i18n language support', () => {
  it.each([
    [['it-IT'], 'it'],
    [['de-DE'], 'de'],
    [['fr-FR'], 'fr'],
    [['ru-RU'], 'ru'],
    [['zh-CN'], 'zh'],
    [['zh-Hans-CN'], 'zh'],
    [['ja-JP'], 'ja'],
    [['pt-PT'], 'pt-BR'],
    [['es-MX'], 'es'],
    [['en-GB'], 'en'],
  ] as const)('maps browser languages %j to %s', (browserLanguages, expectedLanguage) => {
    expect(languageFromBrowser(browserLanguages)).toBe(expectedLanguage)
  })

  it('uses the first supported language from browser preferences', () => {
    expect(languageFromBrowser(['nl-NL', 'fr-FR', 'en-US'])).toBe('fr')
  })

  it('falls back to English when browser languages are unsupported', () => {
    expect(languageFromBrowser(['nl-NL'])).toBe(fallbackLanguage)
  })

  it('registers resources for every supported language', () => {
    const configuredLanguages = i18n.options.supportedLngs

    expect(configuredLanguages).toBeDefined()
    expect(configuredLanguages).not.toBe(false)

    if (configuredLanguages === undefined || configuredLanguages === false) {
      throw new Error('supportedLngs should list project languages')
    }

    expect(configuredLanguages.filter((language) => language !== 'cimode')).toEqual([...supportedLanguages])

    for (const language of supportedLanguages) {
      expect(i18n.hasResourceBundle(language, 'translation')).toBe(true)
    }
  })
})
