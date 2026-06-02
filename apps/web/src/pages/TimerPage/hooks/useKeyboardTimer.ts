import { useEffect } from 'react'
import type { TimerMachine } from './useTimerMachine'

export function useKeyboardTimer(timer: TimerMachine) {
  useEffect(() => {
    let spaceDown = false

    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target) || event.repeat) {
        return
      }

      if (timer.status === 'running') {
        event.preventDefault()
        timer.stopTimer()
        return
      }

      if (event.code === 'Space') {
        event.preventDefault()

        if (!spaceDown) {
          spaceDown = true
          timer.beginHold()
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
      timer.releaseHold()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [timer])
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
