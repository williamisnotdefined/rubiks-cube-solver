import { useEffect, useRef } from 'react'
import type { TimerMachine } from '../useTimerMachine'

export function useKeyboardTimer(timer: TimerMachine, disabled = false) {
  const timerRef = useRef(timer)
  const disabledRef = useRef(disabled)
  timerRef.current = timer
  disabledRef.current = disabled

  useEffect(() => {
    let spaceDown = false

    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target) || event.repeat) {
        return
      }

      const currentTimer = timerRef.current

      if (currentTimer.status === 'running') {
        event.preventDefault()
        currentTimer.stopTimer()
        return
      }

      if (disabledRef.current) {
        return
      }

      if (event.code === 'Space') {
        event.preventDefault()

        if (!spaceDown) {
          spaceDown = true
          currentTimer.beginHold()
        }
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.code !== 'Space' || !spaceDown) {
        return
      }

      event.preventDefault()
      spaceDown = false
      timerRef.current.releaseHold()
    }

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
