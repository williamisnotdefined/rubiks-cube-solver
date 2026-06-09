import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import { AppErrorBoundary } from '@components/AppErrorBoundary'
import { AppShell } from '@components/layout/AppShell'
import type { PageNavRoute } from '@components/layout/PageNav'

const SolvePage = lazy(() => import('./pages/SolvePage/SolvePage').then((module) => ({ default: module.SolvePage })))
const TimerPage = lazy(() => import('./pages/TimerPage/TimerPage').then((module) => ({ default: module.TimerPage })))
const AlgorithmsIndexPage = lazy(() => import('./pages/AlgorithmsPage/AlgorithmsIndexPage').then((module) => ({ default: module.AlgorithmsIndexPage })))
const AlgorithmsPuzzlePage = lazy(() => import('./pages/AlgorithmsPage/AlgorithmsPuzzlePage').then((module) => ({ default: module.AlgorithmsPuzzlePage })))
const AlgorithmSetPage = lazy(() => import('./pages/AlgorithmsPage/AlgorithmSetPage').then((module) => ({ default: module.AlgorithmSetPage })))

function App() {
  const location = useLocation()
  const route: PageNavRoute = location.pathname.startsWith('/algoritmos')
    ? 'algorithms'
    : location.pathname === '/timer'
      ? 'timer'
      : 'solve'

  return (
    <AppShell activeRoute={route}>
      <AppErrorBoundary resetKeys={[location.pathname]}>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Navigate replace to="/solve" />} />
            <Route path="/solve" element={<SolvePage />} />
            <Route path="/timer" element={<TimerPage />} />
            <Route path="/algoritmos" element={<AlgorithmsIndexPage />} />
            <Route path="/algoritmos/:puzzleId" element={<AlgorithmsPuzzlePage />} />
            <Route path="/algoritmos/:puzzleId/:methodId" element={<AlgorithmSetPage />} />
            <Route path="*" element={<Navigate replace to="/solve" />} />
          </Routes>
        </Suspense>
      </AppErrorBoundary>
    </AppShell>
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
