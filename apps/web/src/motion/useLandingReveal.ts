import { useEffect, type RefObject } from 'react'
import { prefersReducedMotion } from './gsap'

export function useLandingReveal(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const root = ref.current

    if (root === null || prefersReducedMotion()) {
      return
    }

    const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-landing-reveal]'))

    if (targets.length === 0) {
      return
    }

    if (typeof IntersectionObserver === 'undefined') {
      for (const target of targets) {
        target.classList.add('is-visible')
      }
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        }
      },
      { root, rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    )

    for (const target of targets) {
      observer.observe(target)
    }

    return () => observer.disconnect()
  }, [ref])
}
