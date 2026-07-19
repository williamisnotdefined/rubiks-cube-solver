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
    expect(staticPaths).toContain('/stores/')
  })

  it('renders the localized product route without a temporary SEO snapshot', async () => {
    const result = await render('/pt-BR/solve/')

    expect(result.appHtml).toContain('<h1')
    expect(result.appHtml).toContain('Resolver quebra-cabeça')
    expect(result.appHtml).not.toContain('Solver de Cubo Magico Online')
    expect(result.appHtml).not.toContain('Carregando rota')
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

  it('renders the localized stores directory with its item list', async () => {
    const result = await render('/pt-BR/stores/')

    expect(result.appHtml).toContain('<h1')
    expect(result.appHtml).toContain('Lojas')
    expect(result.metadata.canonicalUrl).toBe('https://speedcube.com.br/pt-BR/stores/')
    expect(result.jsonLd.some((value) => value['@type'] === 'ItemList')).toBe(true)
  })
})
