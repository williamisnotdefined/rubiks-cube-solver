import { describe, expect, it } from 'vitest'
import { algorithmSetSummaries } from '@pages/AlgorithmsPage/sets/algorithmSetMetadata'
import { cubingSites } from '@pages/CubingSitesPage/sites'
import { cubingStores } from '@pages/StoresPage/stores'
import {
  appRouteManifest,
  getSeoMetadata,
  isSeoIndexablePath,
  localeFromPathname,
  localizedPath,
  prefixedSeoLocales,
  routableStaticPaths,
  seoIndexablePaths,
  stripLocalePrefix,
} from '../routes'

describe('SEO route metadata', () => {
  it('uses en-US for unprefixed routes and route prefixes for every indexed locale', () => {
    expect(localeFromPathname('/solve')).toBe('en-US')

    for (const locale of prefixedSeoLocales) {
      expect(localeFromPathname(localizedPath('/solve', locale))).toBe(locale)
      expect(stripLocalePrefix(localizedPath('/algorithms/3x3/oll', locale))).toBe(
        '/algorithms/3x3/oll',
      )
    }
  })

  it('builds canonical metadata for English algorithm pages without translating slugs', () => {
    const metadata = getSeoMetadata('/algorithms/3x3/oll')

    expect(metadata.locale).toBe('en-US')
    expect(metadata.path).toBe('/algorithms/3x3/oll')
    expect(metadata.canonicalUrl).toBe('https://speedcube.com.br/algorithms/3x3/oll/')
    expect(metadata.title).toContain('3x3 OLL Algorithms')
    expect(metadata.noindex).toBe(false)
  })

  it('keeps lightweight algorithm metadata aligned with algorithm page labels', () => {
    const puzzleMetadata = getSeoMetadata('/algorithms/3x3')
    const setMetadata = getSeoMetadata('/algorithms/2x2/eg-1')
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
    expect(metadata.itemList).toEqual(
      cubingSites.map((site) => ({ name: site.name, path: site.url })),
    )
    expect(metadata.itemList?.[0]).toEqual({
      name: 'Cubo Velocidade',
      path: 'https://cubovelocidade.com.br/',
    })
    expect(metadata.noindex).toBe(false)
  })

  it('builds canonical metadata for the English stores page', () => {
    const metadata = getSeoMetadata('/stores')

    expect(metadata.locale).toBe('en-US')
    expect(metadata.path).toBe('/stores')
    expect(metadata.canonicalUrl).toBe('https://speedcube.com.br/stores/')
    expect(metadata.title).toContain('Speed Cube Stores')
    expect(metadata.itemList).toHaveLength(cubingStores.length)
    expect(metadata.itemList).toEqual(
      cubingStores.map((store) => ({ name: store.name, path: store.url })),
    )
    expect(metadata.noindex).toBe(false)
  })

  it('keeps indexable routes indexable when the server adds trailing slashes', () => {
    for (const pathname of [
      '/solve/',
      '/timer/',
      '/channels/',
      '/sites/',
      '/stores/',
      '/pt-BR/solve/',
      '/pt-BR/timer/',
      '/pt-BR/sites/',
      '/pt-BR/stores/',
    ]) {
      const metadata = getSeoMetadata(pathname)

      expect(metadata.noindex).toBe(false)
      expect(metadata.canonicalUrl.endsWith('/')).toBe(true)
    }

    expect(stripLocalePrefix('/en/algorithms/3x3/oll/')).toBe('/algorithms/3x3/oll')
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

  it('uses the runtime manifest as the source of indexable route families', () => {
    const manifestPaths = appRouteManifest
      .filter((route) => route.indexable)
      .map((route) => route.path)

    expect(manifestPaths).toContain('/solve')
    expect(manifestPaths).toContain('/notations/:puzzleId')
    expect(
      seoIndexablePaths.every((path) =>
        manifestPaths.some((route) => routeMatchesPath(route, path)),
      ),
    ).toBe(true)
  })

  it('excludes redirects, untranslated records, and incomplete pages from indexing', () => {
    for (const path of [
      '/api/wca-data',
      '/records/world',
      '/notations/skewb',
      '/notations/clock',
    ]) {
      expect(isSeoIndexablePath(path)).toBe(false)
      expect(getSeoMetadata(path).noindex).toBe(true)
    }
  })

  it('keeps valid noindex pages in the routable static manifest', () => {
    for (const path of ['/records/world', '/notations/skewb', '/notations/clock']) {
      expect(routableStaticPaths).toContain(path)
      expect(seoIndexablePaths).not.toContain(path)
    }
  })
})

function routeMatchesPath(route: string, path: string): boolean {
  const routeSegments = route.split('/').filter(Boolean)
  const pathSegments = path.split('/').filter(Boolean)

  return (
    routeSegments.length === pathSegments.length &&
    routeSegments.every(
      (segment, index) => segment.startsWith(':') || segment === pathSegments[index],
    )
  )
}
