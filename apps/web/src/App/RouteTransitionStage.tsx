import { AnimatePresence, motion, usePresence, useReducedMotion, type Variants } from 'motion/react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { type Location, useLocation } from 'react-router'

type RouteTransitionStageProps = {
  children: (location: Location, markReady: () => void) => ReactNode
}

const routeEase = [0.22, 1, 0.36, 1] as const
const sliceDelays = [0, 0.035, 0.07] as const

const pageVariants: Variants = {
  enter: { opacity: 0.35, scale: 0.992, y: 14 },
  exit: {
    opacity: 0.35,
    scale: 0.992,
    transition: { duration: 0.24, ease: routeEase },
    y: -10,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { delay: 0.08, duration: 0.38, ease: routeEase },
    y: 0,
  },
}

export function RouteTransitionStage({ children }: RouteTransitionStageProps) {
  const location = useLocation()
  const reduceMotion = useReducedMotion() === true
  const [displayedLocation, setDisplayedLocation] = useState(location)
  const [hasNavigated, setHasNavigated] = useState(false)
  const [readyPathname, setReadyPathname] = useState(location.pathname)
  const pendingLocation = useRef(location)
  const pathnameChanged = displayedLocation.pathname !== location.pathname
  const markReady = useCallback(() => {
    setReadyPathname(displayedLocation.pathname)
  }, [displayedLocation.pathname])

  pendingLocation.current = location

  useEffect(() => {
    if ((reduceMotion || !pathnameChanged) && displayedLocation.key !== location.key) {
      setDisplayedLocation(location)
    }
  }, [displayedLocation.key, location, pathnameChanged, reduceMotion])

  if (reduceMotion) {
    return (
      <div className='relative flex min-h-0 flex-1 flex-col overflow-hidden'>
        <div
          className='flex min-h-0 flex-1 flex-col overflow-hidden'
          data-testid='route-transition-content'
        >
          {children(location, markReady)}
        </div>
      </div>
    )
  }

  return (
    <div className='relative flex min-h-0 flex-1 flex-col overflow-hidden'>
      <AnimatePresence
        initial={false}
        mode='wait'
        onExitComplete={() => {
          setDisplayedLocation(pendingLocation.current)
          setHasNavigated(true)
        }}
      >
        {pathnameChanged ? null : (
          <RouteFrame
            key={`route:${displayedLocation.pathname}`}
            ready={readyPathname === displayedLocation.pathname}
            revealOnMount={hasNavigated}
          >
            {children(displayedLocation, markReady)}
          </RouteFrame>
        )}
      </AnimatePresence>
    </div>
  )
}

type RouteFrameProps = {
  children: ReactNode
  ready: boolean
  revealOnMount: boolean
}

function RouteFrame({ children, ready, revealOnMount }: RouteFrameProps) {
  const [isPresent, safeToRemove] = usePresence()
  let pageAnimation = 'exit'

  useEffect(() => {
    if (!isPresent && !ready) {
      safeToRemove?.()
    }
  }, [isPresent, ready, safeToRemove])

  if (isPresent) {
    pageAnimation = 'enter'
  }
  if (isPresent && ready) {
    pageAnimation = 'visible'
  }

  return (
    <div className='relative flex min-h-0 flex-1 flex-col overflow-hidden'>
      <motion.div
        animate={pageAnimation}
        className='flex min-h-0 flex-1 flex-col overflow-hidden'
        data-testid='route-transition-content'
        initial={false}
        variants={pageVariants}
      >
        {children}
      </motion.div>
      <RouteCurtain
        isPresent={isPresent}
        onCovered={safeToRemove}
        ready={ready}
        revealOnMount={revealOnMount}
      />
    </div>
  )
}

type RouteCurtainProps = {
  isPresent: boolean
  onCovered: (() => void) | null | undefined
  ready: boolean
  revealOnMount: boolean
}

function RouteCurtain({ isPresent, onCovered, ready, revealOnMount }: RouteCurtainProps) {
  return (
    <div
      aria-hidden='true'
      className='pointer-events-none absolute inset-0 z-50 grid grid-rows-3 overflow-hidden'
      data-ready={ready}
      data-testid='route-transition-curtain'
    >
      {sliceDelays.map((delay, index) => (
        <motion.div
          animate={{ x: isPresent && ready ? '105%' : '0%' }}
          className='bg-primary'
          initial={revealOnMount ? { x: '0%' } : false}
          key={delay}
          onAnimationComplete={() => {
            if (!isPresent && index === sliceDelays.length - 1) {
              onCovered?.()
            }
          }}
          transition={{ delay, duration: isPresent ? 0.34 : 0.3, ease: routeEase }}
        />
      ))}
    </div>
  )
}
