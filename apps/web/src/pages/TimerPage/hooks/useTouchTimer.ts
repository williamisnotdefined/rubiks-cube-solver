import type { PointerEvent } from 'react'
import type { TimerMachine } from './useTimerMachine'

type TouchTimerHandlers = {
  onPointerCancel: () => void
  onPointerDown: (event: PointerEvent<HTMLElement>) => void
  onPointerLeave: () => void
  onPointerUp: (event: PointerEvent<HTMLElement>) => void
}

export function useTouchTimer(timer: TimerMachine): TouchTimerHandlers {
  return {
    onPointerCancel: timer.cancelHold,
    onPointerDown(event) {
      event.preventDefault()
      event.currentTarget.setPointerCapture?.(event.pointerId)
      timer.beginHold()
    },
    onPointerLeave: timer.cancelHold,
    onPointerUp(event) {
      event.preventDefault()
      event.currentTarget.releasePointerCapture?.(event.pointerId)
      timer.releaseHold()
    },
  }
}
