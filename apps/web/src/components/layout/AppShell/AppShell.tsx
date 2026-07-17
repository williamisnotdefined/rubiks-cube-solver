import type { ReactNode } from 'react'
import { useThemePreferenceSync } from '@core/theme/themeStore'
import { PageNav, type PageNavRoute } from '../PageNav'

type AppShellProps = {
  activeRoute: PageNavRoute
  children: ReactNode
  initialRouteReady?: boolean
  interactive?: boolean
}

export function AppShell({
  activeRoute,
  children,
  initialRouteReady = true,
  interactive = true,
}: AppShellProps) {
  useThemePreferenceSync()

  return (
    <div
      className='flex h-dvh min-h-0 flex-col overflow-hidden bg-background text-foreground md:flex-row'
      data-app-interactive={interactive}
      data-app-shell='true'
      data-initial-route-ready={initialRouteReady}
      inert={interactive ? undefined : true}
    >
      <PageNav activeRoute={activeRoute} />
      <div
        className='relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'
        data-app-content='true'
      >
        {children}
      </div>
    </div>
  )
}
