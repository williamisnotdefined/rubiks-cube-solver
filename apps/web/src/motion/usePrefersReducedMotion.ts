import { useEffect, useState } from 'react'
import { prefersReducedMotion } from './gsap'

export function usePrefersReducedMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(prefersReducedMotion)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => setReduceMotion(mediaQuery.matches)

    updatePreference()
    mediaQuery.addEventListener('change', updatePreference)
    return () => mediaQuery.removeEventListener('change', updatePreference)
  }, [])

  return reduceMotion
}
