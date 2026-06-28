import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router'
import { AppErrorBoundary } from '@components/AppErrorBoundary'
import { AppShell } from '@components/layout/AppShell'
import type { PageNavRoute } from '@components/layout/PageNav'
import { Seo } from '@src/seo/Seo'
import { localeFromPathname, localePrefix, localizedPath, prefixedSeoLocales, stripLocalePrefix } from '@src/seo/routes'

const SolvePage = lazy(() => import('../pages/SolvePage/SolvePage').then((module) => ({ default: module.SolvePage })))
const TimerPage = lazy(() => import('../pages/TimerPage/TimerPage').then((module) => ({ default: module.TimerPage })))
const AlgorithmsIndexPage = lazy(() => import('../pages/AlgorithmsPage/AlgorithmsIndexPage').then((module) => ({ default: module.AlgorithmsIndexPage })))
const AlgorithmsPuzzlePage = lazy(() => import('../pages/AlgorithmsPage/AlgorithmsPuzzlePage').then((module) => ({ default: module.AlgorithmsPuzzlePage })))
const AlgorithmSetPage = lazy(() => import('../pages/AlgorithmsPage/AlgorithmSetPage').then((module) => ({ default: module.AlgorithmSetPage })))
const NotationGuidePage = lazy(() => import('../pages/NotationsPage/NotationGuidePage').then((module) => ({ default: module.NotationGuidePage })))
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
            <Route path="/" element={<Navigate replace to="/solve" />} />
            <Route path="/solve" element={<SolvePage />} />
            <Route path="/timer" element={<TimerPage />} />
            <Route path="/channels" element={<YouTubeChannelsPage />} />
            <Route path="/algoritmos" element={<AlgorithmsIndexPage />} />
            <Route path="/algoritmos/:puzzleId" element={<AlgorithmsPuzzlePage />} />
            <Route path="/algoritmos/:puzzleId/:methodId" element={<AlgorithmSetPage />} />
            <Route path="/notations" element={<Navigate replace to="/notations/3x3" />} />
            <Route path="/notations/:puzzleId" element={<NotationGuidePage />} />
            {prefixedSeoLocales.map((locale) => {
              const prefix = localePrefix(locale)

              return [
                <Route key={`${prefix}-root`} path={`/${prefix}`} element={<Navigate replace to={`/${prefix}/solve`} />} />,
                <Route key={`${prefix}-solve`} path={`/${prefix}/solve`} element={<SolvePage />} />,
                <Route key={`${prefix}-timer`} path={`/${prefix}/timer`} element={<TimerPage />} />,
                <Route key={`${prefix}-channels`} path={`/${prefix}/channels`} element={<YouTubeChannelsPage />} />,
                <Route key={`${prefix}-algoritmos`} path={`/${prefix}/algoritmos`} element={<AlgorithmsIndexPage />} />,
                <Route key={`${prefix}-algoritmos-puzzle`} path={`/${prefix}/algoritmos/:puzzleId`} element={<AlgorithmsPuzzlePage />} />,
                <Route key={`${prefix}-algoritmos-method`} path={`/${prefix}/algoritmos/:puzzleId/:methodId`} element={<AlgorithmSetPage />} />,
                <Route key={`${prefix}-notations`} path={`/${prefix}/notations`} element={<Navigate replace to={`/${prefix}/notations/3x3`} />} />,
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

function activeRouteFromPath(pagePath: string): PageNavRoute {
  if (pagePath === '/channels') {
    return 'channels'
  }

  if (pagePath.startsWith('/notations')) {
    return 'notations'
  }

  if (pagePath.startsWith('/algoritmos')) {
    return 'algorithms'
  }

  if (pagePath === '/timer') {
    return 'timer'
  }

  return 'solve'
}

function NotFoundPage() {
  const { t } = useTranslation()
  const location = useLocation()
  const solvePath = localizedPath('/solve', localeFromPathname(location.pathname))

  return (
    <main className="grid min-h-0 flex-1 place-items-center bg-app-bg p-6 text-app-text">
      <section className="grid max-w-xl gap-4 border border-app-border bg-app-surface p-6">
        <h1 className="text-3xl font-black uppercase tracking-[-0.04em] text-app-text">
          {t('common.notFoundTitle')}
        </h1>
        <p className="text-sm leading-6 text-app-muted">
          {t('common.notFoundBody')}
        </p>
        <Link
          className="inline-flex w-fit border border-app-border bg-app-text px-4 py-3 text-xs font-extrabold uppercase tracking-[0.14em] text-app-inverse outline-none focus-visible:ring-2 focus-visible:ring-app-focus/50"
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
    <div className="grid min-h-0 flex-1 place-items-center border border-app-border bg-app-surface p-6 text-xs font-extrabold uppercase tracking-[0.18em] text-app-muted" role="status">
      {t('common.loadingRoute')}
    </div>
  )
}

export default App
