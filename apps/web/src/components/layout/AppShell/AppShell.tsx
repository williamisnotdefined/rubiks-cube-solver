import type { ReactNode } from 'react'
import { useThemePreferenceSync } from '@core/theme/themeStore'
import { PageNav, type PageNavRoute } from '../PageNav'

type AppShellProps = {
  activeRoute: PageNavRoute
  children: ReactNode
}

export function AppShell({ activeRoute, children }: AppShellProps) {
  useThemePreferenceSync()

  return (
    <div className='flex h-dvh min-h-0 flex-col overflow-hidden bg-background text-foreground md:flex-row'>
      <PageNav activeRoute={activeRoute} />
      <div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'>{children}</div>
    </div>
  )
}
