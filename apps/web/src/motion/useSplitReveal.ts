import { useEffect, type RefObject } from 'react'
import { loadGsap, loadSplitText, prefersReducedMotion } from './gsap'

type SplitRevealOptions = {
  delay?: number
  enabled?: boolean
  selector?: string
  stagger?: number
}

export function useSplitReveal<T extends HTMLElement>(
  scopeRef: RefObject<T | null>,
  {
    delay = 0,
    enabled = true,
    selector = '[data-split]',
    stagger = 0.055,
  }: SplitRevealOptions = {},
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

      if (scope === null) {
        return
      }

      const targets = scope.matches(selector)
        ? [scope]
        : Array.from(scope.querySelectorAll<HTMLElement>(selector))

      if (targets.length === 0) {
        return
      }

      gsap.registerPlugin(SplitText)

      const split = SplitText.create(targets, {
        linesClass: 'split-line',
        mask: 'lines',
        type: 'lines',
      })

      const tween = gsap.from(split.lines, {
        delay,
        duration: 0.7,
        ease: 'expo.out',
        opacity: 0,
        stagger,
        yPercent: 110,
      })

      revert = () => {
        tween.kill()

        try {
          split.revert()
        } catch {
          // React may replace the title DOM between renders; nothing to revert then.
        }
      }
    })().catch(() => undefined)

    return () => {
      cancelled = true
      revert?.()
    }
  }, [delay, enabled, scopeRef, selector, stagger])
}
