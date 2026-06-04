import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { PointerEvent } from 'react'
import type { TimerMachine } from '../useTimerMachine'
import { useTouchTimer } from '../useTouchTimer'

describe('useTouchTimer', () => {
  it('starts and releases the hold around pointer capture', () => {
    const timer = timerMachine()
    const setPointerCapture = vi.fn()
    const releasePointerCapture = vi.fn()
    const preventDefault = vi.fn()
    const { result } = renderHook(() => useTouchTimer(timer))

    result.current.onPointerDown(
      pointerEvent({ pointerId: 7, preventDefault, setPointerCapture }),
    )
    result.current.onPointerUp(
      pointerEvent({ pointerId: 7, preventDefault, releasePointerCapture }),
    )

    expect(preventDefault).toHaveBeenCalledTimes(2)
    expect(setPointerCapture).toHaveBeenCalledWith(7)
    expect(releasePointerCapture).toHaveBeenCalledWith(7)
    expect(timer.beginHold).toHaveBeenCalled()
    expect(timer.releaseHold).toHaveBeenCalled()
  })

  it('cancels hold on pointer leave and cancel', () => {
    const timer = timerMachine()
    const { result } = renderHook(() => useTouchTimer(timer))

    result.current.onPointerLeave()
    result.current.onPointerCancel()

    expect(timer.cancelHold).toHaveBeenCalledTimes(2)
  })
})

function timerMachine(): TimerMachine {
  return {
    beginHold: vi.fn(),
    cancelHold: vi.fn(),
    elapsedMs: 0,
    inspectionPenalty: 'ok',
    inspectionRemainingMs: 15_000,
    releaseHold: vi.fn(),
    resetStopped: vi.fn(),
    status: 'idle',
    stopTimer: vi.fn(),
  }
}

function pointerEvent({
  pointerId,
  preventDefault,
  releasePointerCapture,
  setPointerCapture,
}: {
  pointerId: number
  preventDefault: () => void
  releasePointerCapture?: (pointerId: number) => void
  setPointerCapture?: (pointerId: number) => void
}): PointerEvent<HTMLElement> {
  return {
    currentTarget: {
      releasePointerCapture,
      setPointerCapture,
    },
    pointerId,
    preventDefault,
  } as PointerEvent<HTMLElement>
}
