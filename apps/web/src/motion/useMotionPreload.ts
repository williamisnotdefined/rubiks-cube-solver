import { useEffect } from 'react'
import { loadGsap, loadSplitText, prefersReducedMotion } from './gsap'

type IdleWindow = Window & {
  cancelIdleCallback?: (handle: number) => void
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
}

export function useMotionPreload(enabled = true): void {
  useEffect(() => {
    if (!enabled || prefersReducedMotion()) {
      return
    }

    const preload = () => {
      void loadGsap()
      void loadSplitText()
    }

    const idleWindow = window as IdleWindow

    if (typeof idleWindow.requestIdleCallback === 'function') {
      const handle = idleWindow.requestIdleCallback(preload, { timeout: 2000 })

      return () => idleWindow.cancelIdleCallback?.(handle)
    }

    const handle = window.setTimeout(preload, 1000)

    return () => window.clearTimeout(handle)
  }, [enabled])
}
