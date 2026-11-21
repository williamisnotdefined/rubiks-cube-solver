import { useEffect, useRef } from 'react'
import { hasFinePointer, loadGsap, prefersReducedMotion } from '@src/motion/gsap'

export function CursorLayer() {
  const layerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const layer = layerRef.current

    if (layer === null || prefersReducedMotion() || !hasFinePointer()) {
      return
    }

    const dot = layer.querySelector<HTMLElement>('.cursor-square')
    const ring = layer.querySelector<HTMLElement>('.cursor-ring')

    if (dot === null || ring === null) {
      return
    }

    let cancelled = false
    let cleanup: (() => void) | undefined

    document.documentElement.classList.add('has-custom-cursor')

    void loadGsap().then(({ gsap }) => {
      if (cancelled) {
        return
      }

      gsap.set([dot, ring], { xPercent: -50, yPercent: -50 })
      const dotX = gsap.quickTo(dot, 'x', { duration: 0.08, ease: 'power2.out' })
      const dotY = gsap.quickTo(dot, 'y', { duration: 0.08, ease: 'power2.out' })
      const ringX = gsap.quickTo(ring, 'x', { duration: 0.32, ease: 'power3.out' })
      const ringY = gsap.quickTo(ring, 'y', { duration: 0.32, ease: 'power3.out' })

      const handleMove = (event: PointerEvent) => {
        layer.style.opacity = '1'
        dotX(event.clientX)
        dotY(event.clientY)
        ringX(event.clientX)
        ringY(event.clientY)
      }

      const handleOver = (event: PointerEvent) => {
        if (!(event.target instanceof Element)) {
          return
        }

        const interactive = event.target.closest(
          'a, button, [role="button"], input, textarea, select, [contenteditable="true"]',
        )

        if (interactive === null) {
          layer.dataset.state = 'default'
          return
        }

        const isText = interactive.matches(
          'input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]), textarea, select, [contenteditable="true"]',
        )

        layer.dataset.state = isText ? 'text' : 'link'
      }

      const handleDown = () => {
        layer.dataset.down = 'true'
      }

      const handleUp = () => {
        layer.dataset.down = 'false'
      }

      const handleLeave = () => {
        layer.style.opacity = '0'
      }

      window.addEventListener('pointermove', handleMove)
      window.addEventListener('pointerover', handleOver)
      window.addEventListener('pointerdown', handleDown)
      window.addEventListener('pointerup', handleUp)
      document.documentElement.addEventListener('pointerleave', handleLeave)

      cleanup = () => {
        window.removeEventListener('pointermove', handleMove)
        window.removeEventListener('pointerover', handleOver)
        window.removeEventListener('pointerdown', handleDown)
        window.removeEventListener('pointerup', handleUp)
        document.documentElement.removeEventListener('pointerleave', handleLeave)
        gsap.killTweensOf([dot, ring])
      }
    })

    return () => {
      cancelled = true
      cleanup?.()
      document.documentElement.classList.remove('has-custom-cursor')
    }
  }, [])

  return (
    <div
      ref={layerRef}
      aria-hidden='true'
      className='cursor-layer'
      data-down='false'
      data-state='default'
    >
      <div className='cursor-square' />
      <div className='cursor-ring' />
    </div>
  )
}
