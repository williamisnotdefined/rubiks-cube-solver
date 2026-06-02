import { useEffect, useState } from 'react'
import { AppShell } from '@components/layout/AppShell'
import type { PageNavRoute } from '@components/layout/PageNav'
import { SolvePage } from './pages/SolvePage/SolvePage'
import { TimerPage } from './pages/TimerPage/TimerPage'

function App() {
  const [route, setRoute] = useState<PageNavRoute>(() => routeFromHash())

  useEffect(() => {
    function handleHashChange() {
      setRoute(routeFromHash())
    }

    window.addEventListener('hashchange', handleHashChange)

    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  return (
    <AppShell activeRoute={route}>
      {route === 'timer' ? <TimerPage /> : <SolvePage />}
    </AppShell>
  )
}

export default App

function routeFromHash(): PageNavRoute {
  return window.location.hash === '#/timer' ? 'timer' : 'solve'
}
