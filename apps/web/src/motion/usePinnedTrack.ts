import { useEffect, type RefObject } from 'react'

type PinnedTrackOptions = {
  enabled: boolean
  sectionRef: RefObject<HTMLElement | null>
  stageRef: RefObject<HTMLDivElement | null>
  trackRef: RefObject<HTMLDivElement | null>
}

/**
 * Converts vertical page scroll into horizontal track movement.
 *
 * The section owns the extra scroll distance; the stage stays sticky while the
 * track is translated. Mobile and reduced-motion fall back to native scrolling.
 */
export function usePinnedTrack({
  enabled,
  sectionRef,
  stageRef,
  trackRef,
}: PinnedTrackOptions): void {
  useEffect(() => {
    const section = sectionRef.current
    const stage = stageRef.current
    const track = trackRef.current
    const scrollRoot = section?.closest<HTMLElement>('[data-route-scroll]')

    if (section === null || stage === null || track === null) {
      return
    }

    if (!enabled || scrollRoot === null || scrollRoot === undefined) {
      section.removeAttribute('data-pinned')
      section.style.removeProperty('height')
      section.style.removeProperty('--story-progress')
      track.style.removeProperty('transform')
      return
    }

    const sectionElement: HTMLElement = section
    const stageElement: HTMLDivElement = stage
    const trackElement: HTMLDivElement = track
    const scrollElement: HTMLElement = scrollRoot
    let frame = 0
    let travel = 0
    let sectionTop = 0
    let distance = 0

    function update() {
      frame = 0

      const progress =
        distance > 0
          ? Math.min(
              1,
              Math.max(0, (scrollElement.scrollTop - sectionTop) / distance),
            )
          : 0

      trackElement.style.transform = `translate3d(${-progress * travel}px, 0, 0)`
      sectionElement.style.setProperty('--story-progress', String(progress))
    }

    function measure() {
      travel = Math.max(0, trackElement.scrollWidth - stageElement.clientWidth)
      sectionElement.style.height = `${stageElement.offsetHeight + travel}px`
      sectionTop = sectionElement.getBoundingClientRect().top + scrollElement.scrollTop
      distance = sectionElement.offsetHeight - stageElement.offsetHeight
      sectionElement.setAttribute('data-pinned', 'true')
      update()
    }

    function handleScroll() {
      if (frame === 0) {
        frame = window.requestAnimationFrame(update)
      }
    }

    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)

    resizeObserver?.observe(stageElement)
    resizeObserver?.observe(trackElement)
    window.addEventListener('resize', measure)
    scrollElement.addEventListener('scroll', handleScroll, { passive: true })
    measure()

    return () => {
      if (frame !== 0) {
        window.cancelAnimationFrame(frame)
      }

      resizeObserver?.disconnect()
      window.removeEventListener('resize', measure)
      scrollElement.removeEventListener('scroll', handleScroll)
      sectionElement.removeAttribute('data-pinned')
      sectionElement.style.removeProperty('height')
      sectionElement.style.removeProperty('--story-progress')
      trackElement.style.removeProperty('transform')
    }
  }, [enabled, sectionRef, stageRef, trackRef])
}
