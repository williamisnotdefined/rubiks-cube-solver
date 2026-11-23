import { useEffect, type RefObject } from 'react'
import { hasFinePointer, loadGsap, prefersReducedMotion } from '@src/motion/gsap'
import { createFloaterConfigs } from './heroFloaters'

type UseHeroFloatersOptions = {
  rootRef: RefObject<HTMLDivElement | null>
  enabled?: boolean
}

/**
 * Keeps decorative hero objects drifting and gives them a short, organic
 * response to the pointer. GSAP only touches transforms; React never re-renders.
 */
export function useHeroFloaters({
  rootRef,
  enabled = true,
}: UseHeroFloatersOptions): void {
  useEffect(() => {
    const root = rootRef.current

    if (root === null || !enabled || prefersReducedMotion() || !hasFinePointer()) {
      return
    }

    const rootElement: HTMLDivElement = root
    let cancelled = false
    let cleanup: (() => void) | undefined

    void loadGsap().then(({ gsap }) => {
      if (cancelled) {
        return
      }

      const floaters = [...rootElement.querySelectorAll<HTMLElement>('.hero-floater')]
      const inners = [...rootElement.querySelectorAll<HTMLElement>('.hero-floater-inner')]

      if (floaters.length === 0 || inners.length === 0) {
        return
      }

      const configs = createFloaterConfigs(
        floaters.length,
        Math.floor(performance.now()) ^ 0x9e3779b9,
      )
      const fallbackConfig = configs[0]

      if (fallbackConfig === undefined) {
        return
      }

      const idleTweens = floaters.map((floater, index) => {
        const config = configs[index] ?? fallbackConfig

        return gsap.to(floater, {
          delay: config.delay,
          duration: config.duration,
          ease: 'sine.inOut',
          repeat: -1,
          rotation: config.rotation,
          x: config.amplitudeX,
          y: config.amplitudeY,
          yoyo: true,
        })
      })
      const innerX = inners.map((inner) =>
        gsap.quickTo(inner, 'x', { duration: 0.45, ease: 'power3.out' }),
      )
      const innerY = inners.map((inner) =>
        gsap.quickTo(inner, 'y', { duration: 0.45, ease: 'power3.out' }),
      )

      let frame = 0
      let pointerX = 0
      let pointerY = 0
      let rect = rootElement.getBoundingClientRect()

      function applyPointer() {
        frame = 0
        const now = performance.now() * 0.0015

        for (let index = 0; index < inners.length; index += 1) {
          const config = configs[index] ?? fallbackConfig
          const jitterX = Math.sin(now + config.phase) * 3
          const jitterY = Math.cos(now * 0.83 + config.phase) * 3
          const strength = 30 * config.reaction

          innerX[index]?.(pointerX * strength * config.pointerX + jitterX)
          innerY[index]?.(pointerY * strength * config.pointerY + jitterY)
        }
      }

      function handlePointerMove(event: PointerEvent) {
        pointerX = (event.clientX - (rect.left + rect.width / 2)) / rect.width
        pointerY = (event.clientY - (rect.top + rect.height / 2)) / rect.height

        if (frame === 0) {
          frame = window.requestAnimationFrame(applyPointer)
        }
      }

      function handleResize() {
        rect = rootElement.getBoundingClientRect()
      }

      rootElement.dataset.heroFloatersReady = 'true'
      window.addEventListener('pointermove', handlePointerMove, { passive: true })
      window.addEventListener('resize', handleResize)

      cleanup = () => {
        cancelled = true
        if (frame !== 0) {
          window.cancelAnimationFrame(frame)
        }
        window.removeEventListener('pointermove', handlePointerMove)
        window.removeEventListener('resize', handleResize)
        idleTweens.forEach((tween) => tween.kill())
        gsap.killTweensOf(inners)
        delete rootElement.dataset.heroFloatersReady
      }
    })

    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [enabled, rootRef])
}
