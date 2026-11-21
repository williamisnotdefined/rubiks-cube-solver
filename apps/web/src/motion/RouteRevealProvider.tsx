import type { ReactNode } from 'react'
import { RouteRevealContext, type RouteRevealPhase } from './routeReveal'

type RouteRevealProviderProps = {
  children: ReactNode
  phase: RouteRevealPhase
}

export function RouteRevealProvider({ children, phase }: RouteRevealProviderProps) {
  return <RouteRevealContext.Provider value={phase}>{children}</RouteRevealContext.Provider>
}
