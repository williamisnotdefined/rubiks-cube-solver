import { useEffect, useRef, useState } from 'react'
import type { RubiksCubeElement } from '@rubiks-cube-solver/rubiks-cube/view'
import { useVisualizationRegistration } from '@components/VisualizationRegistration'
import { prefersReducedMotion } from '@src/motion/gsap'
import { useHeroCubeMoves } from '@src/motion/useHeroCubeMoves'

export function AmbientCube() {
  const hostRef = useRef<HTMLDivElement>(null)
  const cubeRef = useRef<RubiksCubeElement>(null)
  const [requested, setRequested] = useState(false)
  const { status } = useVisualizationRegistration('cube', requested)
  const ready = requested && status === 'ready'
  useHeroCubeMoves({ cubeRef, hostRef, ready })

  useEffect(() => {
    const host = hostRef.current

    if (host === null) {
      return
    }

    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      const immediate = window.setTimeout(() => setRequested(true), 0)
      return () => window.clearTimeout(immediate)
    }

    let timeout: number | undefined
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return
        }

        observer.disconnect()
        timeout = window.setTimeout(() => setRequested(true), 250)
      },
      { rootMargin: '160px' },
    )

    observer.observe(host)

    return () => {
      observer.disconnect()
      if (timeout !== undefined) {
        window.clearTimeout(timeout)
      }
    }
  }, [])

  useEffect(() => {
    const host = hostRef.current
    const scrollRoot = host?.closest<HTMLElement>('[data-route-scroll]')

    if (host === null || scrollRoot === null || scrollRoot === undefined || prefersReducedMotion()) {
      return
    }

    const scrollElement: HTMLElement = scrollRoot
    const hostElement: HTMLDivElement = host
    let frame = 0
    let maxScroll = 1

    function measure() {
      maxScroll = Math.max(1, scrollElement.scrollHeight - scrollElement.clientHeight)
    }

    function update() {
      frame = 0
      const progress = Math.min(1, Math.max(0, scrollElement.scrollTop / maxScroll))
      const cubeHeight = hostElement.offsetHeight
      const compact = window.innerWidth < 1024
      // Keep the cube clearly visible at the bottom, especially on mobile.
      const travel = Math.max(
        0,
        window.innerHeight * (compact ? 0.34 : 0.5) +
          cubeHeight * (compact ? 0.08 : 0.12),
      )
      const drift = -progress * travel
      const rotate = progress * 16
      const scale = 1 + progress * 0.03
      const shift = progress * 20

      hostElement.style.setProperty('--ambient-cube-x', `${shift}px`)
      hostElement.style.setProperty('--ambient-cube-drift', `${drift}px`)
      hostElement.style.setProperty('--ambient-cube-rotate', `${rotate}deg`)
      hostElement.style.setProperty('--ambient-cube-scale', String(scale))
    }

    function handleScroll() {
      if (frame === 0) {
        measure()
        frame = window.requestAnimationFrame(update)
      }
    }

    function handleResize() {
      measure()
      handleScroll()
    }

    measure()
    update()
    scrollElement.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleResize)

    return () => {
      if (frame !== 0) {
        window.cancelAnimationFrame(frame)
      }

      scrollElement.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
      hostElement.style.removeProperty('--ambient-cube-x')
      hostElement.style.removeProperty('--ambient-cube-drift')
      hostElement.style.removeProperty('--ambient-cube-rotate')
      hostElement.style.removeProperty('--ambient-cube-scale')
    }
  }, [])

  return (
    <div
      aria-hidden='true'
      className='landing-ambient pointer-events-none'
      data-hero-cube-moves='0'
      data-landing-cube='true'
      ref={hostRef}
    >
      {ready ? (
        <rubiks-cube
          className='landing-webgl block size-full'
          ref={cubeRef}
          animation-speed-ms='180'
          animation-style='exponential'
          camera-peek-angle-horizontal='0.62'
          camera-peek-angle-vertical='0.55'
          camera-radius='5.8'
          cube-type='Three'
          piece-gap='1.045'
        />
      ) : null}
    </div>
  )
}
