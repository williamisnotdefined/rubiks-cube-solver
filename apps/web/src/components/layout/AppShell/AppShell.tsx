import type { ReactNode } from 'react'
import { CommandPalette } from '@components/CommandPalette'
import { CursorLayer } from '@components/CursorLayer'
import { GrainOverlay } from '@components/GrainOverlay'
import { useThemePreferenceSync } from '@core/theme/themeStore'
import { PageNav, type PageNavRoute } from '../PageNav'

type AppShellProps = {
  activeRoute: PageNavRoute
  children: ReactNode
  initialRouteReady?: boolean
  interactive?: boolean
  onOpenCookiePreferences?: () => void
}

export function AppShell({
  activeRoute,
  children,
  initialRouteReady = true,
  interactive = true,
  onOpenCookiePreferences,
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
      <a
        className='sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:border-2 focus:border-foreground focus:bg-background focus:px-4 focus:py-3 focus:font-mono focus:text-xs focus:uppercase focus:tracking-widest'
        href='#app-content'
      >
        Skip to content
      </a>
      <PageNav activeRoute={activeRoute} onOpenCookiePreferences={onOpenCookiePreferences} />
      <div
        className='relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'
        data-app-content='true'
        id='app-content'
        tabIndex={-1}
      >
        {children}
      </div>
      <GrainOverlay />
      <CursorLayer />
      <CommandPalette />
    </div>
  )
}
