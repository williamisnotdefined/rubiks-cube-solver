import type { PointerEvent } from 'react'
import type { TimerMachine } from '../useTimerMachine'

type TouchTimerHandlers = {
  onPointerCancel: () => void
  onPointerDown: (event: PointerEvent<HTMLElement>) => void
  onPointerLeave: () => void
  onPointerUp: (event: PointerEvent<HTMLElement>) => void
}

export function useTouchTimer(timer: TimerMachine, disabled = false): TouchTimerHandlers {
  return {
    onPointerCancel() {
      timer.cancelHold()
    },
    onPointerDown(event) {
      if (isInteractiveEvent(event)) {
        return
      }

      event.preventDefault()

      if (disabled) {
        return
      }

      event.currentTarget.setPointerCapture?.(event.pointerId)
      timer.beginHold()
    },
    onPointerLeave() {
      timer.cancelHold()
    },
    onPointerUp(event) {
      if (isInteractiveEvent(event)) {
        return
      }

      event.preventDefault()
      event.currentTarget.releasePointerCapture?.(event.pointerId)
      timer.releaseHold()
    },
  }
}

const interactiveSelector =
  'a[href], button, input, select, textarea, [contenteditable="true"], [role="button"], [role="combobox"], [role="link"], [role="switch"]'

function isInteractiveEvent(event: PointerEvent<HTMLElement>): boolean {
  return event.target instanceof Element && event.target.closest(interactiveSelector) !== null
}
