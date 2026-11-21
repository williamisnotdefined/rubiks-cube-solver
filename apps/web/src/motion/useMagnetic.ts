import { useEffect, type RefObject } from 'react'
import { hasFinePointer, loadGsap, prefersReducedMotion } from './gsap'

export function useMagnetic(
  ref: RefObject<HTMLElement | null>,
  strength = 7,
): void {
  useEffect(() => {
    const element = ref.current

    if (element === null || prefersReducedMotion() || !hasFinePointer()) {
      return
    }

    let cancelled = false
    let cleanup: (() => void) | undefined

    void loadGsap().then(({ gsap }) => {
      if (cancelled) {
        return
      }

      const xTo = gsap.quickTo(element, 'x', { duration: 0.35, ease: 'power3.out' })
      const yTo = gsap.quickTo(element, 'y', { duration: 0.35, ease: 'power3.out' })

      const handleMove = (event: PointerEvent) => {
        const bounds = element.getBoundingClientRect()
        const offsetX = event.clientX - (bounds.left + bounds.width / 2)
        const offsetY = event.clientY - (bounds.top + bounds.height / 2)

        xTo((offsetX / bounds.width) * strength * 2)
        yTo((offsetY / bounds.height) * strength * 2)
      }

      const handleLeave = () => {
        xTo(0)
        yTo(0)
      }

      element.addEventListener('pointermove', handleMove)
      element.addEventListener('pointerleave', handleLeave)

      cleanup = () => {
        element.removeEventListener('pointermove', handleMove)
        element.removeEventListener('pointerleave', handleLeave)
        gsap.killTweensOf(element)
        gsap.set(element, { clearProps: 'transform' })
      }
    })
      .catch(() => undefined)

    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [ref, strength])
}
