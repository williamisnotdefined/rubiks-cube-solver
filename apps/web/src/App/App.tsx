import { lazy, startTransition, Suspense, useEffect, useState, type ReactElement } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router'
import { AppErrorBoundary } from '@components/AppErrorBoundary'
import { AppShell } from '@components/layout/AppShell'
import { Seo } from '@src/seo/Seo'
import {
  appRouteManifest,
  getSeoMetadata,
  localeFromPathname,
  localePrefix,
  localizedPath,
  prefixedSeoLocales,
  stripLocalePrefix,
  type AppRouteKind,
  type SeoItem,
} from '@src/seo/routes'
import { activeRouteFromPath } from './activeRouteFromPath'
import { RouteTransitionStage } from './RouteTransitionStage'

const loadSolvePage = () =>
  import('../pages/SolvePage/SolvePageRoute').then((module) => ({
    default: module.SolvePageRoute,
  }))
const loadTimerPage = () =>
  import('../pages/TimerPage/TimerPage').then((module) => ({ default: module.TimerPage }))
const loadWorldRecordsPage = () =>
  import('../pages/WorldRecordsPage/WorldRecordsPageRoute').then((module) => ({
    default: module.WorldRecordsPageRoute,
  }))
const loadAlgorithmsIndexPage = () =>
  import('../pages/AlgorithmsPage/AlgorithmsIndexPage').then((module) => ({
    default: module.AlgorithmsIndexPage,
  }))
const loadAlgorithmsPuzzlePage = () =>
  import('../pages/AlgorithmsPage/AlgorithmsPuzzlePage').then((module) => ({
    default: module.AlgorithmsPuzzlePage,
  }))
const loadAlgorithmSetPage = () =>
  import('../pages/AlgorithmsPage/AlgorithmSetPage').then((module) => ({
    default: module.AlgorithmSetPage,
  }))
const loadCubingSitesPage = () =>
  import('../pages/CubingSitesPage/CubingSitesPage').then((module) => ({
    default: module.CubingSitesPage,
  }))
const loadNotationGuidePage = () =>
  import('../pages/NotationsPage/NotationGuidePage').then((module) => ({
    default: module.NotationGuidePage,
  }))
const loadYouTubeChannelsPage = () =>
  import('../pages/YouTubeChannelsPage/YouTubeChannelsPage').then((module) => ({
    default: module.YouTubeChannelsPage,
  }))

const SolvePage = lazy(loadSolvePage)
const TimerPage = lazy(loadTimerPage)
const WorldRecordsPage = lazy(loadWorldRecordsPage)
const AlgorithmsIndexPage = lazy(loadAlgorithmsIndexPage)
const AlgorithmsPuzzlePage = lazy(loadAlgorithmsPuzzlePage)
const AlgorithmSetPage = lazy(loadAlgorithmSetPage)
const CubingSitesPage = lazy(loadCubingSitesPage)
const NotationGuidePage = lazy(loadNotationGuidePage)
const YouTubeChannelsPage = lazy(loadYouTubeChannelsPage)

type AppProps = {
  initialStatic?: boolean
}

function App({ initialStatic = false }: AppProps) {
  const location = useLocation()
  const [showStaticContent, setShowStaticContent] = useState(initialStatic)
  const [initialRouteReady, setInitialRouteReady] = useState(initialStatic)
  const [initialRouteLoadFailed, setInitialRouteLoadFailed] = useState(false)
  const pagePath = stripLocalePrefix(location.pathname)
  const route = activeRouteFromPath(pagePath)

  useEffect(() => {
    if (!showStaticContent) {
      return
    }

    let active = true
    setInitialRouteLoadFailed(false)
    void loadRouteForPath(pagePath).then(
      () => {
        if (active) {
          startTransition(() => setShowStaticContent(false))
        }
      },
      () => {
        if (active) {
          setInitialRouteLoadFailed(true)
        }
      },
    )

    return () => {
      active = false
    }
  }, [pagePath, showStaticContent])

  return (
    <AppShell activeRoute={route} initialRouteReady={initialRouteReady}>
      <Seo />
      <RouteTransitionStage>
        {(displayedLocation, markReady) => (
          <AppErrorBoundary
            resetKeys={[displayedLocation.pathname]}
            onError={() => {
              markReady()
              setInitialRouteReady(true)
            }}
          >
            {showStaticContent ? (
              <>
                <StaticRouteContent />
                {initialRouteLoadFailed ? <InitialRouteLoadError /> : null}
              </>
            ) : (
              <Suspense fallback={<RouteFallback />}>
                <Routes location={displayedLocation}>
                  <Route path='/' element={<Navigate replace to='/solve/' />} />
                  <Route path='/notations' element={<Navigate replace to='/notations/3x3/' />} />
                  <Route path='/en/*' element={<LegacyEnglishRedirect />} />
                  {appRouteManifest.map((manifestRoute) => (
                    <Route
                      key={manifestRoute.path}
                      path={manifestRoute.path}
                      element={elementForRoute(manifestRoute.kind)}
                    />
                  ))}
                  {prefixedSeoLocales.flatMap((locale) => {
                    const prefix = localePrefix(locale)

                    return [
                      <Route
                        key={`${prefix}-root`}
                        path={`/${prefix}`}
                        element={<Navigate replace to={`/${prefix}/solve/`} />}
                      />,
                      <Route
                        key={`${prefix}-notations`}
                        path={`/${prefix}/notations`}
                        element={<Navigate replace to={`/${prefix}/notations/3x3/`} />}
                      />,
                      ...appRouteManifest.map((manifestRoute) => (
                        <Route
                          key={`${prefix}-${manifestRoute.path}`}
                          path={`/${prefix}${manifestRoute.path}`}
                          element={elementForRoute(manifestRoute.kind)}
                        />
                      )),
                    ]
                  })}
                  <Route path='*' element={<NotFoundPage />} />
                </Routes>
                <RouteReady onInitialReady={setInitialRouteReady} onReady={markReady} />
              </Suspense>
            )}
          </AppErrorBoundary>
        )}
      </RouteTransitionStage>
    </AppShell>
  )
}

function InitialRouteLoadError() {
  const { t } = useTranslation()

  return (
    <div
      className='absolute inset-x-4 bottom-4 z-10 flex items-center justify-between gap-3 rounded-lg border bg-card p-3 text-sm text-card-foreground shadow-lg'
      role='alert'
    >
      <span>{t('errorBoundary.description')}</span>
      <button
        className='shrink-0 rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50'
        type='button'
        onClick={() => window.location.reload()}
      >
        {t('errorBoundary.retry')}
      </button>
    </div>
  )
}

function loadRouteForPath(pagePath: string): Promise<unknown> {
  if (pagePath === '/timer') {
    return loadTimerPage()
  }
  if (pagePath.startsWith('/records')) {
    return loadWorldRecordsPage()
  }
  if (pagePath === '/channels') {
    return loadYouTubeChannelsPage()
  }
  if (pagePath === '/sites') {
    return loadCubingSitesPage()
  }
  if (pagePath.startsWith('/notations')) {
    return loadNotationGuidePage()
  }
  if (pagePath.startsWith('/algoritmos')) {
    const segmentCount = pagePath.split('/').filter(Boolean).length
    if (segmentCount >= 3) {
      return loadAlgorithmSetPage()
    }
    if (segmentCount === 2) {
      return loadAlgorithmsPuzzlePage()
    }
    return loadAlgorithmsIndexPage()
  }

  return loadSolvePage()
}

function RouteReady({
  onInitialReady,
  onReady,
}: {
  onInitialReady: (ready: boolean) => void
  onReady: () => void
}) {
  useEffect(() => {
    onReady()
    onInitialReady(true)
  }, [onInitialReady, onReady])

  return null
}

function elementForRoute(kind: AppRouteKind): ReactElement {
  switch (kind) {
    case 'algorithms-index':
      return <AlgorithmsIndexPage />
    case 'algorithms-puzzle':
      return <AlgorithmsPuzzlePage />
    case 'algorithms-set':
      return <AlgorithmSetPage />
    case 'channels':
      return <YouTubeChannelsPage />
    case 'notation':
      return <NotationGuidePage />
    case 'records':
      return <WorldRecordsPage />
    case 'sites':
      return <CubingSitesPage />
    case 'solve':
      return <SolvePage />
    case 'timer':
      return <TimerPage />
  }
}

function StaticRouteContent() {
  const location = useLocation()
  const metadata = getSeoMetadata(location.pathname)

  return (
    <main className='flex min-h-0 flex-1 overflow-auto bg-background p-4 text-foreground sm:p-6'>
      <section className='mx-auto grid h-fit w-full max-w-5xl gap-4 rounded-xl border bg-card p-6 text-card-foreground shadow-sm'>
        <p className='text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground'>
          Speedcube
        </p>
        <h1 className='text-3xl font-bold tracking-tight text-foreground sm:text-5xl'>
          {metadata.title.replace(' | Speedcube', '')}
        </h1>
        <p className='max-w-3xl text-sm leading-6 text-muted-foreground'>{metadata.description}</p>
        {metadata.breadcrumbs.length > 1 ? (
          <nav aria-label='Breadcrumb'>
            <ol className='flex flex-wrap gap-3 text-sm text-muted-foreground'>
              {metadata.breadcrumbs.map((item) => (
                <li key={item.path}>
                  <Link to={localizedPath(item.path, metadata.locale)}>{item.name}</Link>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        {metadata.itemList === undefined ? null : (
          <StaticItemList items={metadata.itemList} locale={metadata.locale} />
        )}
      </section>
    </main>
  )
}

function StaticItemList({
  items,
  locale,
}: {
  items: SeoItem[]
  locale: ReturnType<typeof localeFromPathname>
}) {
  return (
    <ul className='grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-3'>
      {items.map((item) => {
        const external = item.path.startsWith('http://') || item.path.startsWith('https://')
        const href = external ? item.path : localizedPath(item.path, locale)

        return (
          <li key={item.path}>
            <a href={href}>{item.name}</a>
          </li>
        )
      })}
    </ul>
  )
}

function LegacyEnglishRedirect() {
  const location = useLocation()
  const destination = localizedPath(stripLocalePrefix(location.pathname), 'en-US')

  return (
    <Navigate
      replace
      to={{ pathname: destination, search: location.search, hash: location.hash }}
    />
  )
}

function NotFoundPage() {
  const { t } = useTranslation()
  const location = useLocation()
  const solvePath = localizedPath('/solve', localeFromPathname(location.pathname))

  return (
    <main className='grid min-h-0 flex-1 place-items-center bg-background p-6 text-foreground'>
      <section className='grid max-w-xl gap-4 rounded-xl border bg-card p-6 text-card-foreground shadow-sm'>
        <h1 className='text-3xl font-bold tracking-tight text-foreground'>
          {t('common.notFoundTitle')}
        </h1>
        <p className='text-sm leading-6 text-muted-foreground'>{t('common.notFoundBody')}</p>
        <Link
          className='inline-flex h-9 w-fit items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs outline-none transition-colors hover:bg-primary/90 focus-visible:ring-[3px] focus-visible:ring-ring/50'
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
    <div
      className='grid min-h-0 flex-1 place-items-center rounded-xl border bg-card p-6 text-sm font-medium text-muted-foreground shadow-sm'
      role='status'
    >
      {t('common.loadingRoute')}
    </div>
  )
}

export default App
