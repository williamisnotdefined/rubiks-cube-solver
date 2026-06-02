import type { ReactNode } from 'react'
import { PageNav, type PageNavRoute } from './PageNav'

type AppShellProps = {
  activeRoute: PageNavRoute
  children: ReactNode
}

export function AppShell({ activeRoute, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#070707] text-[#f7f7f7]">
      <PageNav activeRoute={activeRoute} />
      {children}
    </div>
  )
}
