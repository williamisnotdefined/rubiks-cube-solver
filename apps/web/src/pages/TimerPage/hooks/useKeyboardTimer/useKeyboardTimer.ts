import { useEffect, useEffectEvent, useRef } from 'react'
import type { TimerMachine } from '../useTimerMachine'

export function useKeyboardTimer(timer: TimerMachine, disabled = false) {
  const spaceDownRef = useRef(false)
  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (isEditableTarget(event.target) || event.repeat) {
      return
    }

    if (timer.status === 'running') {
      event.preventDefault()
      timer.stopTimer()
      return
    }

    if (disabled) {
      return
    }

    if (event.code === 'Space') {
      event.preventDefault()

      if (!spaceDownRef.current) {
        spaceDownRef.current = true
        timer.beginHold()
      }
    }
  })
  const handleKeyUp = useEffectEvent((event: KeyboardEvent) => {
    if (event.code !== 'Space' || !spaceDownRef.current) {
      return
    }

    event.preventDefault()
    spaceDownRef.current = false
    timer.releaseHold()
  })

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.closest(
      'a[href], button, input, select, textarea, [contenteditable="true"], [role="button"], [role="combobox"], [role="link"], [role="menuitem"], [role="option"], [role="switch"], [role="tab"]',
    ) !== null
  )
}
