import { describe, expect, it } from 'vitest'
import { cubingSites } from '@pages/CubingSitesPage/sites'
import { getSeoMetadata, localeFromPathname, localizedPath, prefixedSeoLocales, stripLocalePrefix } from '../routes'

describe('SEO route metadata', () => {
  it('uses pt-BR for unprefixed routes and route prefixes for every indexed locale', () => {
    expect(localeFromPathname('/solve')).toBe('pt-BR')

    for (const locale of prefixedSeoLocales) {
      expect(localeFromPathname(localizedPath('/solve', locale))).toBe(locale)
      expect(stripLocalePrefix(localizedPath('/algoritmos/3x3/oll', locale))).toBe('/algoritmos/3x3/oll')
    }
  })

  it('builds canonical metadata for English algorithm pages without translating slugs', () => {
    const metadata = getSeoMetadata('/en/algoritmos/3x3/oll')

    expect(metadata.locale).toBe('en')
    expect(metadata.path).toBe('/algoritmos/3x3/oll')
    expect(metadata.canonicalUrl).toBe('https://speedcube.com.br/en/algoritmos/3x3/oll/')
    expect(metadata.title).toContain('3x3 OLL Algorithms')
    expect(metadata.noindex).toBe(false)
  })

  it('builds canonical metadata for the English cubing sites page', () => {
    const metadata = getSeoMetadata('/en/sites')

    expect(metadata.locale).toBe('en')
    expect(metadata.path).toBe('/sites')
    expect(metadata.canonicalUrl).toBe('https://speedcube.com.br/en/sites/')
    expect(metadata.title).toContain('Cubing Websites')
    expect(metadata.itemList).toHaveLength(cubingSites.length)
    expect(metadata.itemList?.[0]).toEqual({ name: 'World Cube Association', path: 'https://www.worldcubeassociation.org/' })
    expect(metadata.noindex).toBe(false)
  })

  it('keeps indexable routes indexable when the server adds trailing slashes', () => {
    for (const pathname of ['/solve/', '/timer/', '/channels/', '/sites/', '/en/solve/', '/en/timer/', '/en/sites/']) {
      const metadata = getSeoMetadata(pathname)

      expect(metadata.noindex).toBe(false)
      expect(metadata.canonicalUrl.endsWith('/')).toBe(true)
    }

    expect(stripLocalePrefix('/en/algoritmos/3x3/oll/')).toBe('/algoritmos/3x3/oll')
  })

  it('marks unknown routes as noindex', () => {
    const metadata = getSeoMetadata('/es/missing')

    expect(metadata.locale).toBe('es')
    expect(metadata.noindex).toBe(true)
    expect(metadata.title).toContain('Pagina no encontrada')
  })
})
