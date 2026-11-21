import { createContext, useContext } from 'react'

export type RouteRevealPhase = 'covering' | 'idle' | 'revealing' | 'waiting'

export const titleRevealDelay = 0.06

export const RouteRevealContext = createContext<RouteRevealPhase>('idle')

export function useRouteTitleReveal(): boolean {
  const phase = useContext(RouteRevealContext)

  return phase === 'idle' || phase === 'revealing'
}
