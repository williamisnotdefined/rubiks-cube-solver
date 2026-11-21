import { lazy, Suspense, useEffect, useState, type ComponentType, type ReactElement } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router'
import { AppErrorBoundary } from '@components/AppErrorBoundary'
import { AppShell } from '@components/layout/AppShell'
import { useRoutePrefetch } from '@src/motion/useRoutePrefetch'
import { useMotionPreload } from '@src/motion/useMotionPreload'
import { AnalyticsConsent } from '@src/analytics/AnalyticsConsent'
import { Seo } from '@src/seo/Seo'
import {
  appRouteManifest,
  localeFromPathname,
  localePrefix,
  localizedPath,
  prefixedSeoLocales,
  stripLocalePrefix,
  type AppRouteKind,
} from '@src/seo/routes'
import { activeRouteFromPath } from './activeRouteFromPath'
import { routeLoaders } from './routeLoaders'
import { RouteTransitionStage } from './RouteTransitionStage'

const SolvePage = lazy(routeLoaders.solve)
const TimerPage = lazy(routeLoaders.timer)
const WorldRecordsPage = lazy(routeLoaders.records)
const AlgorithmsIndexPage = lazy(routeLoaders['algorithms-index'])
const AlgorithmsPuzzlePage = lazy(routeLoaders['algorithms-puzzle'])
const AlgorithmSetPage = lazy(routeLoaders['algorithms-set'])
const CubingSitesPage = lazy(routeLoaders.channels)
const StoresPage = lazy(routeLoaders.stores)
const NotationGuidePage = lazy(routeLoaders.notation)
const YouTubeChannelsPage = lazy(routeLoaders.sites)

type AppProps = {
  initialSsg?: boolean
  routeComponents?: Partial<Record<AppRouteKind, ComponentType>>
}

function App({ initialSsg = false, routeComponents }: AppProps) {
  const location = useLocation()
  const [initialRouteReady, setInitialRouteReady] = useState(initialSsg)
  const [interactive, setInteractive] = useState(!initialSsg)
  const [cookiePreferencesOpen, setCookiePreferencesOpen] = useState(false)
  useRoutePrefetch(interactive)
  useMotionPreload(interactive)
  const pagePath = stripLocalePrefix(location.pathname)
  const route = activeRouteFromPath(pagePath)

  return (
    <>
      <AppShell
        activeRoute={route}
        initialRouteReady={initialRouteReady}
        interactive={interactive}
        onOpenCookiePreferences={() => setCookiePreferencesOpen(true)}
      >
        <Seo />
        <RouteTransitionStage>
          {(displayedLocation, markReady) => (
            <AppErrorBoundary
              resetKeys={[displayedLocation.pathname]}
              onError={() => {
                markReady()
                setInitialRouteReady(true)
                setInteractive(true)
              }}
            >
              <Suspense fallback={<RouteFallback />}>
                <Routes location={displayedLocation}>
                  <Route path='/' element={<Navigate replace to='/solve/' />} />
                  <Route path='/notations' element={<Navigate replace to='/notations/3x3/' />} />
                  <Route path='/algoritmos/*' element={<LegacyAlgorithmsRedirect />} />
                  <Route path='/en/*' element={<LegacyEnglishRedirect />} />
                  {appRouteManifest.map((manifestRoute) => (
                    <Route
                      key={manifestRoute.path}
                      path={manifestRoute.path}
                      element={elementForRoute(manifestRoute.kind, setInteractive, routeComponents)}
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
                      <Route
                        key={`${prefix}-legacy-algorithms`}
                        path={`/${prefix}/algoritmos/*`}
                        element={<LegacyAlgorithmsRedirect />}
                      />,
                      ...appRouteManifest.map((manifestRoute) => (
                        <Route
                          key={`${prefix}-${manifestRoute.path}`}
                          path={`/${prefix}${manifestRoute.path}`}
                          element={elementForRoute(
                            manifestRoute.kind,
                            setInteractive,
                            routeComponents,
                          )}
                        />
                      )),
                    ]
                  })}
                  <Route path='*' element={<NotFoundPage />} />
                </Routes>
                <RouteReady onInitialReady={setInitialRouteReady} onReady={markReady} />
              </Suspense>
            </AppErrorBoundary>
          )}
        </RouteTransitionStage>
      </AppShell>
      <AnalyticsConsent
        preferencesOpen={cookiePreferencesOpen}
        onPreferencesOpenChange={setCookiePreferencesOpen}
      />
    </>
  )
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

function elementForRoute(
  kind: AppRouteKind,
  onInteractive: (interactive: boolean) => void,
  routeComponents?: Partial<Record<AppRouteKind, ComponentType>>,
): ReactElement {
  return (
    <RouteHydrationReady onInteractive={onInteractive}>
      {routeElement(kind, routeComponents)}
    </RouteHydrationReady>
  )
}

function routeElement(
  kind: AppRouteKind,
  routeComponents?: Partial<Record<AppRouteKind, ComponentType>>,
): ReactElement {
  const StaticRouteComponent = routeComponents?.[kind]
  if (StaticRouteComponent !== undefined) {
    return <StaticRouteComponent />
  }

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
    case 'stores':
      return <StoresPage />
    case 'solve':
      return <SolvePage />
    case 'timer':
      return <TimerPage />
  }
}

function RouteHydrationReady({
  children,
  onInteractive,
}: {
  children: ReactElement
  onInteractive: (interactive: boolean) => void
}) {
  useEffect(() => {
    onInteractive(true)
  }, [onInteractive])

  return children
}

function LegacyEnglishRedirect() {
  const location = useLocation()
  const pagePath = stripLocalePrefix(location.pathname).replace(
    /^\/algoritmos(?=\/|$)/,
    '/algorithms',
  )
  const destination = localizedPath(pagePath, 'en-US')

  return (
    <Navigate
      replace
      to={{ pathname: destination, search: location.search, hash: location.hash }}
    />
  )
}

function LegacyAlgorithmsRedirect() {
  const location = useLocation()
  const destination = location.pathname.replace(/\/algoritmos(?=\/|$)/, '/algorithms')

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
