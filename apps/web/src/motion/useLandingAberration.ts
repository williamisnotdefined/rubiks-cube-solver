import { useEffect, type RefObject } from 'react'
import { prefersReducedMotion } from './gsap'

const maxOffsetPx = 32
const scrollCatchUpMs = 90
const offsetCatchUpMs = 70
const trailGain = 0.55

export function useLandingAberration(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const root = ref.current

    if (root === null || prefersReducedMotion()) {
      return
    }

    const landing = root.querySelector<HTMLElement>('.landing-page')

    if (landing === null) {
      return
    }

    let smoothScrollTop = root.scrollTop
    let currentOffset = 0
    let frame = 0
    let lastTime = performance.now()

    function applyOffset(value: number) {
      landing?.style.setProperty('--ca-scroll', `${value.toFixed(2)}px`)
    }

    function step(now: number) {
      const scrollTop = root?.scrollTop ?? 0
      const elapsed = Math.min(Math.max(now - lastTime, 8), 50)
      lastTime = now

      const scrollEase = 1 - Math.exp(-elapsed / scrollCatchUpMs)
      smoothScrollTop += (scrollTop - smoothScrollTop) * scrollEase

      const targetOffset = Math.max(
        -maxOffsetPx,
        Math.min(maxOffsetPx, (scrollTop - smoothScrollTop) * trailGain),
      )
      const offsetEase = 1 - Math.exp(-elapsed / offsetCatchUpMs)
      currentOffset += (targetOffset - currentOffset) * offsetEase

      if (Math.abs(targetOffset - currentOffset) < 0.02) {
        currentOffset = targetOffset
      }

      applyOffset(currentOffset)

      const settled =
        Math.abs(scrollTop - smoothScrollTop) < 0.05 &&
        Math.abs(targetOffset - currentOffset) < 0.02

      if (settled) {
        smoothScrollTop = scrollTop
        currentOffset = 0
        applyOffset(0)
        frame = 0
        return
      }

      frame = requestAnimationFrame(step)
    }

    function handleScroll() {
      if (frame === 0) {
        lastTime = performance.now()
        frame = requestAnimationFrame(step)
      }
    }

    root.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      root.removeEventListener('scroll', handleScroll)
      window.cancelAnimationFrame(frame)
      applyOffset(0)
    }
  }, [ref])
}
