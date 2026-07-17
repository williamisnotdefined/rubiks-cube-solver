import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { type Location, useLocation } from 'react-router'

type RouteTransitionStageProps = {
  children: (location: Location, markReady: () => void) => ReactNode
}

const coverDurationMs = 480
const revealDurationMs = 560

type TransitionPhase = 'covering' | 'idle' | 'revealing' | 'waiting'

export function RouteTransitionStage({ children }: RouteTransitionStageProps) {
  const location = useLocation()
  const reduceMotion = useReducedMotion()
  const [displayedLocation, setDisplayedLocation] = useState(location)
  const [readyLocationKey, setReadyLocationKey] = useState(location.key)
  const [phase, setPhase] = useState<TransitionPhase>('idle')
  const pendingLocation = useRef(location)
  const pathnameChanged = displayedLocation.pathname !== location.pathname
  const markReady = useCallback(() => {
    setReadyLocationKey(displayedLocation.key)
  }, [displayedLocation.key])

  pendingLocation.current = location

  useEffect(() => {
    if (reduceMotion && displayedLocation.key !== location.key) {
      setDisplayedLocation(location)
      setPhase('idle')
      return
    }

    if (!pathnameChanged && displayedLocation.key !== location.key) {
      setDisplayedLocation(location)
      return
    }

    if (pathnameChanged && (phase === 'waiting' || phase === 'revealing')) {
      setDisplayedLocation(location)
      setPhase('waiting')
      return
    }

    if (!pathnameChanged || phase !== 'idle') {
      return
    }

    setPhase('covering')
  }, [displayedLocation.key, location, pathnameChanged, phase, reduceMotion])

  useEffect(() => {
    if (phase !== 'covering') {
      return
    }

    const timeout = window.setTimeout(() => {
      setDisplayedLocation(pendingLocation.current)
      setPhase('waiting')
    }, coverDurationMs)

    return () => window.clearTimeout(timeout)
  }, [phase])

  useEffect(() => {
    if (phase !== 'waiting' || readyLocationKey !== displayedLocation.key) {
      return
    }

    setPhase('revealing')
  }, [displayedLocation.key, phase, readyLocationKey])

  useEffect(() => {
    if (phase !== 'revealing') {
      return
    }

    const timeout = window.setTimeout(() => setPhase('idle'), revealDurationMs)

    return () => window.clearTimeout(timeout)
  }, [phase])

  return (
    <div className='relative flex min-h-0 flex-1 flex-col overflow-hidden'>
      <div
        className='route-transition-page flex min-h-0 flex-1 flex-col overflow-hidden'
        data-phase={reduceMotion ? 'idle' : phase}
        data-testid='route-transition-content'
        inert={!reduceMotion && phase !== 'idle'}
      >
        {children(reduceMotion ? location : displayedLocation, markReady)}
      </div>
      {reduceMotion || phase === 'idle' ? null : (
        <div
          aria-hidden='true'
          className='route-transition-curtain pointer-events-none absolute inset-0 z-50 bg-background'
          data-phase={phase}
          data-ready={readyLocationKey === displayedLocation.key}
          data-testid='route-transition-curtain'
        />
      )}
    </div>
  )
}

function useReducedMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => setReduceMotion(mediaQuery.matches)

    updatePreference()
    mediaQuery.addEventListener('change', updatePreference)
    return () => mediaQuery.removeEventListener('change', updatePreference)
  }, [])

  return reduceMotion
}
