import { useEffect, type RefObject } from 'react'
import { prefersReducedMotion } from './gsap'

export function useSmoothScroll(
  ref: RefObject<HTMLElement | null>,
  enabled = true,
): void {
  useEffect(() => {
    const wrapper = ref.current

    if (!enabled || wrapper === null || prefersReducedMotion()) {
      return
    }

    const content = wrapper.firstElementChild

    if (!(content instanceof HTMLElement)) {
      return
    }

    let cancelled = false
    let frame = 0
    let destroy: (() => void) | undefined

    void import('lenis').then(({ default: Lenis }) => {
      if (cancelled) {
        return
      }

      const lenis = new Lenis({
        content,
        duration: 0.9,
        smoothWheel: true,
        wrapper,
      })

      const raf = (time: number) => {
        lenis.raf(time)
        frame = window.requestAnimationFrame(raf)
      }

      frame = window.requestAnimationFrame(raf)

      destroy = () => {
        window.cancelAnimationFrame(frame)
        lenis.destroy()
      }
    }).catch(() => undefined)

    return () => {
      cancelled = true
      destroy?.()
    }
  }, [enabled, ref])
}
