import { useEffect, useRef } from 'react'
import type { TimerMachine } from './useTimerMachine'

export function useKeyboardTimer(timer: TimerMachine) {
  const timerRef = useRef(timer)
  timerRef.current = timer

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

      if (event.code === 'Space') {
        event.preventDefault()

        if (!spaceDown) {
          spaceDown = true
          currentTimer.beginHold()
        }
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) {
        return
      }

      if (event.code !== 'Space') {
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
    target.isContentEditable ||
    target.tagName === 'BUTTON' ||
    target.tagName === 'INPUT' ||
    target.tagName === 'SELECT' ||
    target.tagName === 'TEXTAREA'
  )
}
