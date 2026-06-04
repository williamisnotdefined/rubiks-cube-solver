import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { TimerMachine } from '../useTimerMachine'
import { useKeyboardTimer } from '../useKeyboardTimer'

describe('useKeyboardTimer', () => {
  it('starts and releases hold from the space key once per keydown', () => {
    const timer = timerMachine({ status: 'idle' })
    renderHook(() => useKeyboardTimer(timer))

    window.dispatchEvent(keyboardEvent('keydown', { code: 'Space', key: ' ' }))
    window.dispatchEvent(keyboardEvent('keydown', { code: 'Space', key: ' ' }))
    window.dispatchEvent(keyboardEvent('keyup', { code: 'Space', key: ' ' }))

    expect(timer.beginHold).toHaveBeenCalledTimes(1)
    expect(timer.releaseHold).toHaveBeenCalledTimes(1)
  })

  it('stops a running timer from any non-editable keydown', () => {
    const timer = timerMachine({ status: 'running' })
    renderHook(() => useKeyboardTimer(timer))

    window.dispatchEvent(keyboardEvent('keydown', { code: 'KeyA', key: 'a' }))

    expect(timer.stopTimer).toHaveBeenCalledTimes(1)
  })

  it('ignores repeat keys, non-space keyup, and editable targets', () => {
    const timer = timerMachine({ status: 'idle' })
    renderHook(() => useKeyboardTimer(timer))
    const input = document.createElement('input')

    window.dispatchEvent(keyboardEvent('keydown', { code: 'Space', key: ' ', repeat: true }))
    window.dispatchEvent(keyboardEvent('keyup', { code: 'KeyA', key: 'a' }))
    window.dispatchEvent(keyboardEvent('keydown', { code: 'Space', key: ' ', target: input }))
    window.dispatchEvent(keyboardEvent('keyup', { code: 'Space', key: ' ', target: input }))

    expect(timer.beginHold).not.toHaveBeenCalled()
    expect(timer.releaseHold).not.toHaveBeenCalled()
  })
})

function timerMachine({ status }: { status: TimerMachine['status'] }): TimerMachine {
  return {
    beginHold: vi.fn(),
    cancelHold: vi.fn(),
    elapsedMs: 0,
    inspectionPenalty: 'ok',
    inspectionRemainingMs: 15_000,
    releaseHold: vi.fn(),
    resetStopped: vi.fn(),
    status,
    stopTimer: vi.fn(),
  }
}

function keyboardEvent(
  type: 'keydown' | 'keyup',
  options: KeyboardEventInit & { target?: EventTarget },
): KeyboardEvent {
  const event = new KeyboardEvent(type, { bubbles: true, ...options })
  if (options.target !== undefined) {
    Object.defineProperty(event, 'target', {
      configurable: true,
      value: options.target,
    })
  }

  return event
}
