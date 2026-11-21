import { useEffect } from 'react'
import { preloadAllRoutes, preloadRoute, routeKindsFromPathname } from '@src/App/routeLoaders'

export function useRoutePrefetch(enabled = true): void {
  useEffect(() => {
    if (!enabled) {
      return
    }

    let cancelled = false

    const warmRoutes = () => {
      if (!cancelled) {
        preloadAllRoutes()
      }
    }

    const idleHandle =
      typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback(warmRoutes, { timeout: 2500 })
        : window.setTimeout(warmRoutes, 1200)

    const prefetchAnchor = (event: Event) => {
      const target = event.target

      if (!(target instanceof Element)) {
        return
      }

      const anchor = target.closest('a[href]')

      if (!(anchor instanceof HTMLAnchorElement)) {
        return
      }

      const url = new URL(anchor.href, window.location.origin)

      if (url.origin !== window.location.origin) {
        return
      }

      for (const kind of routeKindsFromPathname(url.pathname)) {
        preloadRoute(kind)
      }
    }

    document.addEventListener('pointerover', prefetchAnchor, true)
    document.addEventListener('pointerdown', prefetchAnchor, true)
    document.addEventListener('focusin', prefetchAnchor, true)
    document.addEventListener('touchstart', prefetchAnchor, true)

    return () => {
      cancelled = true

      if (typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleHandle)
      } else {
        window.clearTimeout(idleHandle)
      }

      document.removeEventListener('pointerover', prefetchAnchor, true)
      document.removeEventListener('pointerdown', prefetchAnchor, true)
      document.removeEventListener('focusin', prefetchAnchor, true)
      document.removeEventListener('touchstart', prefetchAnchor, true)
    }
  }, [enabled])
}
