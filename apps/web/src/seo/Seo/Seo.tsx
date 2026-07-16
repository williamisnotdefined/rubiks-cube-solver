import { useEffect, useMemo } from 'react'
import { useLocation } from 'react-router'
import i18n, { changeLanguage } from '@src/i18n/i18n'
import { buildJsonLd } from '../jsonLd'
import {
  alternateUrl,
  defaultLocale,
  defaultOgImageUrl,
  getSeoMetadata,
  seoLocales,
  siteName,
} from '../routes'

const seoLinkSelector =
  'link[data-speedcube-seo="true"], link[rel="canonical"], link[rel="alternate"][hreflang]'
const seoJsonLdSelector =
  'script[data-speedcube-seo-jsonld="true"], script[type="application/ld+json"]'
const jsonLdScriptNonce = 'speedcube-jsonld'

export function Seo() {
  const location = useLocation()
  const metadata = useMemo(() => getSeoMetadata(location.pathname), [location.pathname])

  useEffect(() => {
    if (i18n.language !== metadata.locale) {
      void changeLanguage(metadata.locale)
    }
  }, [metadata.locale])

  useEffect(() => {
    document.documentElement.lang = metadata.htmlLang
    document.title = metadata.title

    upsertMeta('name', 'description', metadata.description)
    upsertMeta('name', 'robots', metadata.noindex ? 'noindex,nofollow' : 'index,follow')
    upsertMeta('property', 'og:site_name', siteName)
    upsertMeta('property', 'og:type', 'website')
    upsertMeta('property', 'og:title', metadata.title)
    upsertMeta('property', 'og:description', metadata.description)
    upsertMeta('property', 'og:url', metadata.canonicalUrl)
    upsertMeta('property', 'og:image', defaultOgImageUrl)
    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', metadata.title)
    upsertMeta('name', 'twitter:description', metadata.description)
    upsertMeta('name', 'twitter:image', defaultOgImageUrl)

    clearManagedLinks()
    appendLink('canonical', metadata.canonicalUrl)
    if (!metadata.noindex) {
      for (const locale of seoLocales) {
        appendLink('alternate', alternateUrl(metadata.path, locale), locale)
      }
      appendLink('alternate', alternateUrl(metadata.path, defaultLocale), 'x-default')
    }

    clearManagedJsonLd()
    for (const jsonLd of buildJsonLd(metadata)) {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.nonce = jsonLdScriptNonce
      script.dataset.speedcubeSeoJsonld = 'true'
      script.text = JSON.stringify(jsonLd)
      document.head.append(script)
    }
  }, [metadata])

  return null
}

function upsertMeta(attributeName: 'name' | 'property', attributeValue: string, content: string) {
  const selector = `meta[${attributeName}="${attributeValue}"]`
  const existing = document.head.querySelector<HTMLMetaElement>(selector)
  const meta = existing ?? document.createElement('meta')

  meta.setAttribute(attributeName, attributeValue)
  meta.content = content

  if (existing === null) {
    document.head.append(meta)
  }
}

function appendLink(rel: string, href: string, hreflang?: string) {
  const link = document.createElement('link')
  link.dataset.speedcubeSeo = 'true'
  link.rel = rel
  link.href = href

  if (hreflang !== undefined) {
    link.hreflang = hreflang
  }

  document.head.append(link)
}

function clearManagedLinks() {
  document.head.querySelectorAll(seoLinkSelector).forEach((element) => element.remove())
}

function clearManagedJsonLd() {
  document.head.querySelectorAll(seoJsonLdSelector).forEach((element) => element.remove())
}
