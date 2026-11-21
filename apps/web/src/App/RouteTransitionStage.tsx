import {
  type CSSProperties,
  type ReactNode,
  startTransition,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { type Location, useLocation } from 'react-router'
import { chapterFromPathname, type RouteChapter } from '@core/navigation/chapters'
import { RouteRevealProvider } from '@src/motion/RouteRevealProvider'
import { usePrefersReducedMotion } from '@src/motion/usePrefersReducedMotion'

type RouteTransitionStageProps = {
  children: (location: Location, markReady: () => void) => ReactNode
}

const coverDurationMs = 280
const revealDurationMs = 340
const readyTimeoutMs = 380
const swapDelayMs = 110

type TransitionPhase = 'covering' | 'idle' | 'waiting'

const accentVariables: Record<RouteChapter['accent'], string> = {
  blue: 'var(--cube-blue)',
  green: 'var(--cube-green)',
  orange: 'var(--cube-orange)',
  red: 'var(--cube-red)',
  yellow: 'var(--cube-yellow)',
}

const panelPalette = [
  'var(--cube-blue)',
  'var(--cube-yellow)',
  'var(--cube-red)',
  'var(--cube-white)',
  'var(--cube-orange)',
  'var(--cube-green)',
]
const panelCount = 5

type PanelDirection = 'down' | 'up'

type CurtainPanel = {
  color: string
  delayMs: number
  enterFrom: PanelDirection
  exitTo: PanelDirection
}

function createCurtainPattern(accent: RouteChapter['accent']): CurtainPanel[] {
  const colors = shuffle(panelPalette).slice(0, panelCount)
  colors[Math.floor(panelCount / 2)] = accentVariables[accent]
  const enterDirections = randomDirections(panelCount)
  const exitDirections = randomDirections(panelCount)

  return colors.map((color, index) => ({
    color,
    delayMs: Math.round(Math.random() * 40),
    enterFrom: enterDirections[index] ?? 'up',
    exitTo: exitDirections[index] ?? 'down',
  }))
}

function randomDirections(count: number): PanelDirection[] {
  const directions = Array.from({ length: count }, randomDirection)
  const first = directions[0]

  if (first !== undefined && directions.every((direction) => direction === first)) {
    directions[0] = first === 'up' ? 'down' : 'up'
  }

  return directions
}

function randomDirection(): PanelDirection {
  return Math.random() < 0.5 ? 'up' : 'down'
}

function shuffle<T>(values: readonly T[]): T[] {
  const shuffled = [...values]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }

  return shuffled
}

export function RouteTransitionStage({ children }: RouteTransitionStageProps) {
  const location = useLocation()
  const { t } = useTranslation()
  const reduceMotion = usePrefersReducedMotion()
  const [displayedLocation, setDisplayedLocation] = useState(location)
  const [readyLocationKey, setReadyLocationKey] = useState(location.key)
  const [phase, setPhase] = useState<TransitionPhase>('idle')
  const [previousLocation, setPreviousLocation] = useState(location)
  const [curtainPattern, setCurtainPattern] = useState<CurtainPanel[]>(() =>
    createCurtainPattern(chapterFromPathname(location.pathname).accent),
  )
  const pendingLocation = useRef(location)
  const contentRef = useRef<HTMLDivElement>(null)
  const hasNavigated = useRef(false)
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
      setCurtainPattern(createCurtainPattern(chapterFromPathname(location.pathname).accent))
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
    if (phase === 'covering') {
      hasNavigated.current = true
    }
  }, [phase])

  useEffect(() => {
    if (phase !== 'covering') {
      return
    }

    const swap = window.setTimeout(() => {
      startTransition(() => setDisplayedLocation(pendingLocation.current))
    }, swapDelayMs)

    const cover = window.setTimeout(() => {
      startTransition(() => setDisplayedLocation(pendingLocation.current))
      setPhase('waiting')
    }, coverDurationMs)

    return () => {
      window.clearTimeout(swap)
      window.clearTimeout(cover)
    }
  }, [phase])

  useEffect(() => {
    if (!revealing) {
      return
    }

    const timeout = window.setTimeout(() => setPhase('idle'), revealDurationMs)

    return () => window.clearTimeout(timeout)
  }, [revealing])

  useEffect(() => {
    if (phase !== 'waiting') {
      return
    }

    const timeout = window.setTimeout(() => {
      setReadyLocationKey(displayedLocation.key)
    }, readyTimeoutMs)

    return () => window.clearTimeout(timeout)
  }, [displayedLocation.key, phase])

  useEffect(() => {
    const main = contentRef.current?.querySelector('main')
    if (main instanceof HTMLElement) {
      main.scrollTop = 0
    }
  }, [displayedLocation.key])

  useEffect(() => {
    if (displayedPhase !== 'idle' || !hasNavigated.current) {
      return
    }

    const main = contentRef.current?.querySelector('main')
    if (main instanceof HTMLElement) {
      main.tabIndex = -1
      main.focus({ preventScroll: true })
    }
  }, [displayedPhase])

  const chapter = chapterFromPathname(
    displayedPhase === 'covering' ? location.pathname : displayedLocation.pathname,
  )
  const chapterLabel = t(chapter.labelKey)

  return (
    <div className='relative flex min-h-0 flex-1 flex-col overflow-hidden'>
      <div
        ref={contentRef}
        className='route-transition-page flex min-h-0 flex-1 flex-col overflow-hidden'
        data-phase={reduceMotion ? 'idle' : displayedPhase}
        data-testid='route-transition-content'
        inert={!reduceMotion && phase !== 'idle'}
      >
        <RouteRevealProvider phase={reduceMotion ? 'idle' : displayedPhase}>
          {children(reduceMotion ? location : displayedLocation, markReady)}
        </RouteRevealProvider>
      </div>
      {reduceMotion || displayedPhase === 'idle' ? null : (
        <div
          aria-hidden='true'
          className='route-transition-curtain pointer-events-none absolute inset-0 z-50 flex overflow-hidden'
          data-phase={displayedPhase}
          data-ready={readyLocationKey === displayedLocation.key}
          data-testid='route-transition-curtain'
        >
          {curtainPattern.map((panel, index) => {
            const center = index === Math.floor(panelCount / 2)

            return (
              <div
                className='route-panel relative flex items-center justify-center overflow-hidden'
                key={`${panel.color}-${index}`}
                style={
                  {
                    '--panel-delay': `${panel.delayMs}ms`,
                    '--panel-from': panel.enterFrom === 'up' ? '-105%' : '105%',
                    '--panel-to': panel.exitTo === 'up' ? '-105%' : '105%',
                    backgroundColor: panel.color,
                  } as CSSProperties
                }
              >
                {center ? (
                  <div
                    className='flex max-w-full select-none flex-col items-center gap-1 px-2 text-center uppercase'
                    style={{
                      color: chapter.accent === 'yellow' ? '#0a0a0a' : '#f5f5f0',
                    }}
                  >
                    <span className='route-chapter-label text-[clamp(2.75rem,7vw,7rem)]'>
                      {chapter.number}
                    </span>
                    <span className='label-mono text-[0.65rem] opacity-80'>{chapter.code}</span>
                    <span className='max-w-full text-xs font-semibold leading-none opacity-90'>
                      {chapterLabel}
                    </span>
                  </div>
                ) : (
                  <span className='label-mono absolute bottom-3 text-[0.55rem] opacity-30'>
                    {index + 1}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
