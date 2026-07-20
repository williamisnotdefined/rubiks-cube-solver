import { type ReactNode, useEffect, useRef, useState } from 'react'
import { type Location, useLocation } from 'react-router'

type RouteTransitionStageProps = {
  children: (location: Location, markReady: () => void) => ReactNode
}

const coverDurationMs = 480
const revealDurationMs = 560

type TransitionPhase = 'covering' | 'idle' | 'waiting'

export function RouteTransitionStage({ children }: RouteTransitionStageProps) {
  const location = useLocation()
  const reduceMotion = useReducedMotion()
  const [displayedLocation, setDisplayedLocation] = useState(location)
  const [readyLocationKey, setReadyLocationKey] = useState(location.key)
  const [phase, setPhase] = useState<TransitionPhase>('idle')
  const [previousLocation, setPreviousLocation] = useState(location)
  const pendingLocation = useRef(location)
  const pathnameChanged = displayedLocation.pathname !== location.pathname
  const revealing = phase === 'waiting' && readyLocationKey === displayedLocation.key
  const displayedPhase = revealing ? 'revealing' : phase

  if (reduceMotion && displayedLocation.key !== location.key) {
    setPreviousLocation(location)
    setDisplayedLocation(location)
    setPhase('idle')
  } else if (location !== previousLocation) {
    setPreviousLocation(location)

    if (!pathnameChanged && displayedLocation.key !== location.key) {
      setDisplayedLocation(location)
    } else if (pathnameChanged && phase === 'waiting') {
      setDisplayedLocation(location)
    } else if (pathnameChanged && phase === 'idle') {
      setPhase('covering')
    }
  }

  function markReady() {
    setReadyLocationKey(displayedLocation.key)
  }

  useEffect(() => {
    pendingLocation.current = location
  }, [location])

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
    if (!revealing) {
      return
    }

    const timeout = window.setTimeout(() => setPhase('idle'), revealDurationMs)

    return () => window.clearTimeout(timeout)
  }, [revealing])

  return (
    <div className='relative flex min-h-0 flex-1 flex-col overflow-hidden'>
      <div
        className='route-transition-page flex min-h-0 flex-1 flex-col overflow-hidden'
        data-phase={reduceMotion ? 'idle' : displayedPhase}
        data-testid='route-transition-content'
        inert={!reduceMotion && phase !== 'idle'}
      >
        {children(reduceMotion ? location : displayedLocation, markReady)}
      </div>
      {reduceMotion || displayedPhase === 'idle' ? null : (
        <div
          aria-hidden='true'
          className='route-transition-curtain pointer-events-none absolute inset-0 z-50 bg-background'
          data-phase={displayedPhase}
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
