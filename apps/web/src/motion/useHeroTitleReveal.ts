import { useEffect, type RefObject } from 'react'
import { loadGsap, loadSplitText, prefersReducedMotion } from './gsap'

type HeroTitleRevealOptions = {
  delay?: number
  enabled?: boolean
}

/**
 * Reveals SPEED and CUBE as two independent words, then types .COM.BR.
 * No char masks are used for the brand words, so the chromatic-aberration
 * fringes never change when the reveal finishes.
 */
export function useHeroTitleReveal(
  scopeRef: RefObject<HTMLElement | null>,
  { delay = 0.06, enabled = true }: HeroTitleRevealOptions = {},
): void {
  useEffect(() => {
    if (!enabled || prefersReducedMotion()) {
      return
    }

    let cancelled = false
    let revert: (() => void) | undefined

    void (async () => {
      const [{ gsap }, { SplitText }] = await Promise.all([loadGsap(), loadSplitText()])

      if (cancelled || scopeRef.current === null) {
        return
      }

      await (document.fonts?.ready ?? Promise.resolve())

      if (cancelled) {
        return
      }

      const scope = scopeRef.current
      const brandWords = scope?.querySelectorAll<HTMLElement>('[data-hero-brand]')
      const domain = scope?.querySelector<HTMLElement>('[data-hero-domain]')

      if (
        brandWords === undefined ||
        brandWords.length < 2 ||
        domain === undefined ||
        domain === null
      ) {
        return
      }

      gsap.registerPlugin(SplitText)

      const [speedWord, cubeWord] = brandWords
      const domainSplit = SplitText.create(domain, {
        type: 'chars',
      })

      if (speedWord === undefined || cubeWord === undefined) {
        return
      }

      const timeline = gsap.timeline({ delay })

      timeline.from(speedWord, {
        duration: 0.75,
        ease: 'expo.out',
        opacity: 0,
        rotateX: -80,
        transformOrigin: '0% 100%',
        x: -28,
        y: 40,
      })

      timeline.from(
        cubeWord,
        {
          duration: 0.75,
          ease: 'expo.out',
          opacity: 0,
          rotateX: -80,
          transformOrigin: '0% 100%',
          x: 40,
          y: 48,
        },
        0.08,
      )

      timeline.from(
        domainSplit.chars,
        {
          duration: 0.2,
          ease: 'power2.out',
          opacity: 0,
          stagger: 0.045,
          y: 12,
        },
        0.4,
      )

      revert = () => {
        timeline.kill()

        try {
          domainSplit.revert()
        } catch {
          // React may replace the title DOM between renders; nothing to revert then.
        }
      }
    })().catch(() => undefined)

    return () => {
      cancelled = true
      revert?.()
    }
  }, [delay, enabled, scopeRef])
}
