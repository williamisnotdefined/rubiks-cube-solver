import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import App from '../App'
import { buildJsonLd } from '../seo/jsonLd'
import {
  getSeoMetadata,
  localizedPath,
  routableStaticPaths,
  seoIndexablePaths,
  seoLocales,
  type SeoMetadata,
} from '../seo/routes'
import { changeLanguage } from '../i18n/i18n'

export type StaticRenderResult = {
  appHtml: string
  jsonLd: Record<string, unknown>[]
  metadata: SeoMetadata
}

export const staticPaths = routableStaticPaths.flatMap((path) =>
  seoLocales.map((locale) => localizedPath(path, locale)),
)

export const staticRouteGroups = seoIndexablePaths.map((path) => ({
  alternates: Object.fromEntries(seoLocales.map((locale) => [locale, localizedPath(path, locale)])),
  path,
}))

export async function render(pathname: string): Promise<StaticRenderResult> {
  const metadata = getSeoMetadata(pathname)
  await changeLanguage(metadata.locale)

  return {
    appHtml: renderToString(
      <StaticRouter location={pathname}>
        <App initialStatic />
      </StaticRouter>,
    ),
    jsonLd: buildJsonLd(metadata),
    metadata,
  }
}
