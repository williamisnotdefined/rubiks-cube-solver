import { useMemo, useRef, type PointerEvent } from 'react'
import type { TimerMachine } from '../useTimerMachine'

type TouchTimerHandlers = {
  onPointerCancel: () => void
  onPointerDown: (event: PointerEvent<HTMLElement>) => void
  onPointerLeave: () => void
  onPointerUp: (event: PointerEvent<HTMLElement>) => void
}

export function useTouchTimer(timer: TimerMachine, disabled = false): TouchTimerHandlers {
  const timerRef = useRef(timer)
  const disabledRef = useRef(disabled)
  timerRef.current = timer
  disabledRef.current = disabled

  return useMemo(
    () => ({
      onPointerCancel() {
        timerRef.current.cancelHold()
      },
      onPointerDown(event) {
        if (isInteractiveEvent(event)) {
          return
        }

        event.preventDefault()

        if (disabledRef.current) {
          return
        }

        event.currentTarget.setPointerCapture?.(event.pointerId)
        timerRef.current.beginHold()
      },
      onPointerLeave() {
        timerRef.current.cancelHold()
      },
      onPointerUp(event) {
        if (isInteractiveEvent(event)) {
          return
        }

        event.preventDefault()
        event.currentTarget.releasePointerCapture?.(event.pointerId)
        timerRef.current.releaseHold()
      },
    }),
    [],
  )
}

const interactiveSelector =
  'a[href], button, input, select, textarea, [contenteditable="true"], [role="button"], [role="combobox"], [role="link"], [role="switch"]'

function isInteractiveEvent(event: PointerEvent<HTMLElement>): boolean {
  return event.target instanceof Element && event.target.closest(interactiveSelector) !== null
}
