import type { ReactNode } from 'react'
import { PageNav, type PageNavRoute } from './PageNav'

type AppShellProps = {
  activeRoute: PageNavRoute
  children: ReactNode
}

export function AppShell({ activeRoute, children }: AppShellProps) {
  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-app-bg text-app-text md:flex-row">
      <PageNav activeRoute={activeRoute} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}
