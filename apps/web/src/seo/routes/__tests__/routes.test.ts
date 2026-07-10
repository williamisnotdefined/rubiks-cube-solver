import { describe, expect, it } from 'vitest'
import { algorithmSetSummaries } from '@pages/AlgorithmsPage/sets/algorithmSetMetadata'
import { cubingSites } from '@pages/CubingSitesPage/sites'
import { getSeoMetadata, localeFromPathname, localizedPath, prefixedSeoLocales, stripLocalePrefix } from '../routes'

describe('SEO route metadata', () => {
  it('uses en-US for unprefixed routes and route prefixes for every indexed locale', () => {
    expect(localeFromPathname('/solve')).toBe('en-US')

    for (const locale of prefixedSeoLocales) {
      expect(localeFromPathname(localizedPath('/solve', locale))).toBe(locale)
      expect(stripLocalePrefix(localizedPath('/algoritmos/3x3/oll', locale))).toBe('/algoritmos/3x3/oll')
    }
  })

  it('builds canonical metadata for English algorithm pages without translating slugs', () => {
    const metadata = getSeoMetadata('/algoritmos/3x3/oll')

    expect(metadata.locale).toBe('en-US')
    expect(metadata.path).toBe('/algoritmos/3x3/oll')
    expect(metadata.canonicalUrl).toBe('https://speedcube.com.br/algoritmos/3x3/oll/')
    expect(metadata.title).toContain('3x3 OLL Algorithms')
    expect(metadata.noindex).toBe(false)
  })

  it('keeps lightweight algorithm metadata aligned with algorithm page labels', () => {
    const puzzleMetadata = getSeoMetadata('/algoritmos/3x3')
    const setMetadata = getSeoMetadata('/algoritmos/2x2/eg-1')
    const expected3x3Items = algorithmSetSummaries
      .filter((set) => set.puzzleId === '3x3')
      .map((set) => ({ name: set.title, path: set.path }))

    expect(puzzleMetadata.itemList).toEqual(expected3x3Items)
    expect(setMetadata.title).toContain('2x2 EG-1 Algorithms')
  })

  it('builds canonical metadata for the English cubing sites page', () => {
    const metadata = getSeoMetadata('/sites')

    expect(metadata.locale).toBe('en-US')
    expect(metadata.path).toBe('/sites')
    expect(metadata.canonicalUrl).toBe('https://speedcube.com.br/sites/')
    expect(metadata.title).toContain('Cubing Websites')
    expect(metadata.itemList).toHaveLength(cubingSites.length)
    expect(metadata.itemList).toEqual(cubingSites.map((site) => ({ name: site.name, path: site.url })))
    expect(metadata.itemList?.[0]).toEqual({ name: 'World Cube Association', path: 'https://www.worldcubeassociation.org/' })
    expect(metadata.noindex).toBe(false)
  })

  it('keeps indexable routes indexable when the server adds trailing slashes', () => {
    for (const pathname of ['/solve/', '/timer/', '/channels/', '/sites/', '/pt-BR/solve/', '/pt-BR/timer/', '/pt-BR/sites/']) {
      const metadata = getSeoMetadata(pathname)

      expect(metadata.noindex).toBe(false)
      expect(metadata.canonicalUrl.endsWith('/')).toBe(true)
    }

    expect(stripLocalePrefix('/en/algoritmos/3x3/oll/')).toBe('/algoritmos/3x3/oll')
  })

  it('maps legacy English prefixes to canonical unprefixed URLs', () => {
    const metadata = getSeoMetadata('/en/sites')

    expect(localeFromPathname('/en/sites')).toBe('en-US')
    expect(metadata.canonicalUrl).toBe('https://speedcube.com.br/sites/')
  })

  it('marks unknown routes as noindex', () => {
    const metadata = getSeoMetadata('/es/missing')

    expect(metadata.locale).toBe('es')
    expect(metadata.noindex).toBe(true)
    expect(metadata.title).toContain('Pagina no encontrada')
  })
})
