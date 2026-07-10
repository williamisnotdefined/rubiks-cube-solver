import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router'
import { AppErrorBoundary } from '@components/AppErrorBoundary'
import { AppShell } from '@components/layout/AppShell'
import { Seo } from '@src/seo/Seo'
import { localeFromPathname, localePrefix, localizedPath, prefixedSeoLocales, stripLocalePrefix } from '@src/seo/routes'
import { activeRouteFromPath } from './activeRouteFromPath'

const SolvePage = lazy(() => import('../pages/SolvePage/SolvePageRoute').then((module) => ({ default: module.SolvePageRoute })))
const TimerPage = lazy(() => import('../pages/TimerPage/TimerPage').then((module) => ({ default: module.TimerPage })))
const WorldRecordsPage = lazy(() => import('../pages/WorldRecordsPage/WorldRecordsPageRoute').then((module) => ({ default: module.WorldRecordsPageRoute })))
const AlgorithmsIndexPage = lazy(() => import('../pages/AlgorithmsPage/AlgorithmsIndexPage').then((module) => ({ default: module.AlgorithmsIndexPage })))
const AlgorithmsPuzzlePage = lazy(() => import('../pages/AlgorithmsPage/AlgorithmsPuzzlePage').then((module) => ({ default: module.AlgorithmsPuzzlePage })))
const AlgorithmSetPage = lazy(() => import('../pages/AlgorithmsPage/AlgorithmSetPage').then((module) => ({ default: module.AlgorithmSetPage })))
const CubingSitesPage = lazy(() => import('../pages/CubingSitesPage/CubingSitesPage').then((module) => ({ default: module.CubingSitesPage })))
const NotationGuidePage = lazy(() => import('../pages/NotationsPage/NotationGuidePage').then((module) => ({ default: module.NotationGuidePage })))
const WcaDataDocsRedirectPage = lazy(() => import('../pages/WcaDataApiPage/WcaDataDocsRedirectPage').then((module) => ({ default: module.WcaDataDocsRedirectPage })))
const YouTubeChannelsPage = lazy(() => import('../pages/YouTubeChannelsPage/YouTubeChannelsPage').then((module) => ({ default: module.YouTubeChannelsPage })))

function App() {
  const location = useLocation()
  const pagePath = stripLocalePrefix(location.pathname)
  const route = activeRouteFromPath(pagePath)

  return (
    <AppShell activeRoute={route}>
      <Seo />
      <AppErrorBoundary resetKeys={[location.pathname]}>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Navigate replace to="/solve/" />} />
            <Route path="/solve" element={<SolvePage />} />
            <Route path="/timer" element={<TimerPage />} />
            <Route path="/records/world" element={<WorldRecordsPage />} />
            <Route path="/channels" element={<YouTubeChannelsPage />} />
            <Route path="/sites" element={<CubingSitesPage />} />
            <Route path="/api/wca-data" element={<WcaDataDocsRedirectPage />} />
            <Route path="/algoritmos" element={<AlgorithmsIndexPage />} />
            <Route path="/algoritmos/:puzzleId" element={<AlgorithmsPuzzlePage />} />
            <Route path="/algoritmos/:puzzleId/:methodId" element={<AlgorithmSetPage />} />
            <Route path="/notations" element={<Navigate replace to="/notations/3x3/" />} />
            <Route path="/notations/:puzzleId" element={<NotationGuidePage />} />
            <Route path="/en/*" element={<LegacyEnglishRedirect />} />
            {prefixedSeoLocales.map((locale) => {
              const prefix = localePrefix(locale)

              return [
                <Route key={`${prefix}-root`} path={`/${prefix}`} element={<Navigate replace to={`/${prefix}/solve/`} />} />,
                <Route key={`${prefix}-solve`} path={`/${prefix}/solve`} element={<SolvePage />} />,
                <Route key={`${prefix}-timer`} path={`/${prefix}/timer`} element={<TimerPage />} />,
                <Route key={`${prefix}-records-world`} path={`/${prefix}/records/world`} element={<WorldRecordsPage />} />,
                <Route key={`${prefix}-channels`} path={`/${prefix}/channels`} element={<YouTubeChannelsPage />} />,
                <Route key={`${prefix}-sites`} path={`/${prefix}/sites`} element={<CubingSitesPage />} />,
                <Route key={`${prefix}-api-wca-data`} path={`/${prefix}/api/wca-data`} element={<WcaDataDocsRedirectPage />} />,
                <Route key={`${prefix}-algoritmos`} path={`/${prefix}/algoritmos`} element={<AlgorithmsIndexPage />} />,
                <Route key={`${prefix}-algoritmos-puzzle`} path={`/${prefix}/algoritmos/:puzzleId`} element={<AlgorithmsPuzzlePage />} />,
                <Route key={`${prefix}-algoritmos-method`} path={`/${prefix}/algoritmos/:puzzleId/:methodId`} element={<AlgorithmSetPage />} />,
                <Route key={`${prefix}-notations`} path={`/${prefix}/notations`} element={<Navigate replace to={`/${prefix}/notations/3x3/`} />} />,
                <Route key={`${prefix}-notations-puzzle`} path={`/${prefix}/notations/:puzzleId`} element={<NotationGuidePage />} />,
              ]
            })}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </AppErrorBoundary>
    </AppShell>
  )
}

function LegacyEnglishRedirect() {
  const location = useLocation()
  const destination = localizedPath(stripLocalePrefix(location.pathname), 'en-US')

  return <Navigate replace to={{ pathname: destination, search: location.search, hash: location.hash }} />
}

function NotFoundPage() {
  const { t } = useTranslation()
  const location = useLocation()
  const solvePath = localizedPath('/solve', localeFromPathname(location.pathname))

  return (
    <main className="grid min-h-0 flex-1 place-items-center bg-background p-6 text-foreground">
      <section className="grid max-w-xl gap-4 rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {t('common.notFoundTitle')}
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          {t('common.notFoundBody')}
        </p>
        <Link
          className="inline-flex h-9 w-fit items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs outline-none transition-colors hover:bg-primary/90 focus-visible:ring-[3px] focus-visible:ring-ring/50"
          to={solvePath}
        >
          {t('navigation.solve')}
        </Link>
      </section>
    </main>
  )
}

function RouteFallback() {
  const { t } = useTranslation()

  return (
    <div className="grid min-h-0 flex-1 place-items-center rounded-xl border bg-card p-6 text-sm font-medium text-muted-foreground shadow-sm" role="status">
      {t('common.loadingRoute')}
    </div>
  )
}

export default App
