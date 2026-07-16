import { describe, expect, it } from 'vitest'
import { render, staticPaths, staticRouteGroups } from '../ssg'
import { routableStaticPaths, seoIndexablePaths, seoLocales } from '../../seo/routes'

describe('React static generation', () => {
  it('derives every generated locale path from the SEO manifest', () => {
    expect(staticPaths).toHaveLength(routableStaticPaths.length * seoLocales.length)
    expect(staticRouteGroups.map((route) => route.path)).toEqual(seoIndexablePaths)
    expect(staticPaths).not.toContain('/api/wca-data/')
    expect(staticPaths).toContain('/records/world/')
    expect(staticPaths).toContain('/notations/skewb/')
    expect(staticPaths).toContain('/notations/clock/')
  })

  it('renders localized React markup and JSON-LD without browser-only pages', async () => {
    const result = await render('/pt-BR/solve/')

    expect(result.appHtml).toContain('<h1')
    expect(result.appHtml).toContain('Solver de Cubo Magico Online')
    expect(result.metadata.canonicalUrl).toBe('https://speedcube.com.br/pt-BR/solve/')
    expect(result.jsonLd.some((value) => value['@type'] === 'WebApplication')).toBe(true)
  })

  it('renders routable but non-indexable pages with noindex metadata', async () => {
    for (const path of ['/records/world/', '/notations/skewb/', '/notations/clock/']) {
      const result = await render(path)

      expect(result.appHtml).toContain('<h1')
      expect(result.metadata.noindex).toBe(true)
    }
  })
})
