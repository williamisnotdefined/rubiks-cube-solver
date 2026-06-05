import { useMemo, useRef, type PointerEvent } from 'react'
import type { TimerMachine } from './useTimerMachine'

type TouchTimerHandlers = {
  onPointerCancel: () => void
  onPointerDown: (event: PointerEvent<HTMLElement>) => void
  onPointerLeave: () => void
  onPointerUp: (event: PointerEvent<HTMLElement>) => void
}

export function useTouchTimer(timer: TimerMachine): TouchTimerHandlers {
  const timerRef = useRef(timer)
  timerRef.current = timer

  return useMemo(() => ({
    onPointerCancel() {
      timerRef.current.cancelHold()
    },
    onPointerDown(event) {
      event.preventDefault()
      event.currentTarget.setPointerCapture?.(event.pointerId)
      timerRef.current.beginHold()
    },
    onPointerLeave() {
      timerRef.current.cancelHold()
    },
    onPointerUp(event) {
      event.preventDefault()
      event.currentTarget.releasePointerCapture?.(event.pointerId)
      timerRef.current.releaseHold()
    },
  }), [])
}
