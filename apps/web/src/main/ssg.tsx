import { renderToString } from 'react-dom/server'
import type { ComponentType } from 'react'
import { StaticRouter } from 'react-router'
import App from '../App'
import { AlgorithmSetPage } from '../pages/AlgorithmsPage/AlgorithmSetPage'
import { AlgorithmsIndexPage } from '../pages/AlgorithmsPage/AlgorithmsIndexPage'
import { AlgorithmsPuzzlePage } from '../pages/AlgorithmsPage/AlgorithmsPuzzlePage'
import { CubingSitesPage } from '../pages/CubingSitesPage/CubingSitesPage'
import { NotationGuidePage } from '../pages/NotationsPage/NotationGuidePage'
import { SolvePageRoute } from '../pages/SolvePage/SolvePageRoute'
import { StoresPage } from '../pages/StoresPage/StoresPage'
import { TimerPage } from '../pages/TimerPage/TimerPage'
import { WorldRecordsPageRoute } from '../pages/WorldRecordsPage/WorldRecordsPageRoute'
import { YouTubeChannelsPage } from '../pages/YouTubeChannelsPage/YouTubeChannelsPage'
import { buildJsonLd } from '../seo/jsonLd'
import {
  getSeoMetadata,
  localizedPath,
  routableStaticPaths,
  seoIndexablePaths,
  seoLocales,
  type SeoMetadata,
  type AppRouteKind,
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

const routeComponents = {
  'algorithms-index': AlgorithmsIndexPage,
  'algorithms-puzzle': AlgorithmsPuzzlePage,
  'algorithms-set': AlgorithmSetPage,
  channels: YouTubeChannelsPage,
  notation: NotationGuidePage,
  records: WorldRecordsPageRoute,
  sites: CubingSitesPage,
  solve: SolvePageRoute,
  stores: StoresPage,
  timer: TimerPage,
} satisfies Record<AppRouteKind, ComponentType>

export async function render(pathname: string): Promise<StaticRenderResult> {
  const metadata = getSeoMetadata(pathname)
  await changeLanguage(metadata.locale)
  const appHtml = renderToString(
    <StaticRouter location={pathname}>
      <App initialSsg routeComponents={routeComponents} />
    </StaticRouter>,
  )

  return {
    appHtml,
    jsonLd: buildJsonLd(metadata),
    metadata,
  }
}
