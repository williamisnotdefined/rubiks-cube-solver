import { renderHook } from '@testing-library/react'
import type { PointerEvent } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { TimerMachine } from '../../useTimerMachine'
import { useTouchTimer } from '../useTouchTimer'

describe('useTouchTimer', () => {
  it('starts and releases the hold around pointer capture', () => {
    const timer = timerMachine()
    const setPointerCapture = vi.fn()
    const releasePointerCapture = vi.fn()
    const preventDefault = vi.fn()
    const { result } = renderHook(() => useTouchTimer(timer))

    result.current.onPointerDown(pointerEvent({ pointerId: 7, preventDefault, setPointerCapture }))
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

  it('does not begin or capture a pointer when touch input is disabled', () => {
    const timer = timerMachine()
    const setPointerCapture = vi.fn()
    const preventDefault = vi.fn()
    const { result } = renderHook(() => useTouchTimer(timer, true))

    result.current.onPointerDown(pointerEvent({ pointerId: 7, preventDefault, setPointerCapture }))

    expect(preventDefault).toHaveBeenCalledTimes(1)
    expect(setPointerCapture).not.toHaveBeenCalled()
    expect(timer.beginHold).not.toHaveBeenCalled()
  })

  it('keeps stable handlers while using the latest timer', () => {
    const firstTimer = timerMachine()
    const nextTimer = timerMachine()
    const { result, rerender } = renderHook(({ timer }) => useTouchTimer(timer), {
      initialProps: { timer: firstTimer },
    })
    const firstHandlers = result.current

    rerender({ timer: nextTimer })

    expect(result.current).toBe(firstHandlers)

    result.current.onPointerDown(pointerEvent({ pointerId: 3, preventDefault: vi.fn() }))
    result.current.onPointerUp(pointerEvent({ pointerId: 3, preventDefault: vi.fn() }))

    expect(firstTimer.beginHold).not.toHaveBeenCalled()
    expect(firstTimer.releaseHold).not.toHaveBeenCalled()
    expect(nextTimer.beginHold).toHaveBeenCalledTimes(1)
    expect(nextTimer.releaseHold).toHaveBeenCalledTimes(1)
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
