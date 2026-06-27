import { alternateUrl, defaultOgImageUrl, seoLocales, siteName, siteOrigin, type SeoMetadata } from './routes'

type JsonLd = Record<string, unknown>

export function buildJsonLd(metadata: SeoMetadata): JsonLd[] {
  const graph: JsonLd[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      inLanguage: metadata.locale,
      name: siteName,
      url: siteOrigin,
    },
  ]

  if (metadata.breadcrumbs.length > 1) {
    graph.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: metadata.breadcrumbs.map((item, index) => ({
        '@type': 'ListItem',
        item: alternateUrl(item.path, metadata.locale),
        name: item.name,
        position: index + 1,
      })),
    })
  }

  if (metadata.jsonLdKind === 'web-application') {
    graph.push({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      applicationCategory: 'GameApplication',
      description: metadata.description,
      image: defaultOgImageUrl,
      inLanguage: [...seoLocales],
      name: metadata.title,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'BRL',
      },
      operatingSystem: 'Web',
      url: metadata.canonicalUrl,
    })
  }

  if (metadata.jsonLdKind === 'item-list' && metadata.itemList !== undefined) {
    graph.push({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: metadata.itemList.map((item, index) => ({
        '@type': 'ListItem',
        item: alternateUrl(item.path, metadata.locale),
        name: item.name,
        position: index + 1,
      })),
      name: metadata.title,
    })
  }

  if (metadata.jsonLdKind === 'tech-article') {
    graph.push({
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      description: metadata.description,
      headline: metadata.title,
      image: defaultOgImageUrl,
      inLanguage: metadata.locale,
      url: metadata.canonicalUrl,
    })
  }

  return graph
}
