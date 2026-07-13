import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTimerMachine } from '../useTimerMachine'

describe('useTimerMachine', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('transitions through hold, run, and stop', () => {
    const onSolveComplete = vi.fn()
    const { result } = renderHook(() =>
      useTimerMachine({ holdToStartMs: 100, inspectionEnabled: false, onSolveComplete }),
    )

    act(() => result.current.beginHold())
    expect(result.current.status).toBe('holding')

    act(() => vi.advanceTimersByTime(100))
    expect(result.current.status).toBe('ready')

    act(() => result.current.releaseHold())
    expect(result.current.status).toBe('running')

    act(() => {
      vi.advanceTimersByTime(1_234)
      result.current.stopTimer()
    })

    expect(result.current.status).toBe('stopped')
    expect(onSolveComplete).toHaveBeenCalledWith(expect.any(Number), 'ok')
  })

  it('cancels a hold before the timer is ready', () => {
    const onSolveComplete = vi.fn()
    const { result } = renderHook(() =>
      useTimerMachine({ holdToStartMs: 100, inspectionEnabled: false, onSolveComplete }),
    )

    act(() => result.current.beginHold())
    act(() => result.current.cancelHold())

    expect(result.current.status).toBe('idle')

    act(() => vi.advanceTimersByTime(100))
    expect(result.current.status).toBe('idle')
    expect(onSolveComplete).not.toHaveBeenCalled()
  })

  it('ignores duplicate holds and cancels on release before ready', () => {
    const onSolveComplete = vi.fn()
    const { result } = renderHook(() =>
      useTimerMachine({ holdToStartMs: 100, inspectionEnabled: false, onSolveComplete }),
    )

    act(() => result.current.beginHold())
    act(() => result.current.beginHold())
    expect(result.current.status).toBe('holding')

    act(() => result.current.releaseHold())
    expect(result.current.status).toBe('idle')

    act(() => result.current.cancelHold())
    expect(result.current.status).toBe('idle')
  })

  it('starts immediately when hold-to-start is disabled and resets stopped state', () => {
    const onSolveComplete = vi.fn()
    const { result } = renderHook(() =>
      useTimerMachine({ holdToStartMs: 0, inspectionEnabled: false, onSolveComplete }),
    )

    act(() => result.current.beginHold())
    expect(result.current.status).toBe('ready')

    act(() => result.current.releaseHold())
    expect(result.current.status).toBe('running')

    act(() => result.current.beginHold())
    expect(result.current.status).toBe('stopped')

    act(() => result.current.resetStopped())
    expect(result.current.status).toBe('idle')
    expect(result.current.elapsedMs).toBe(0)
  })

  it('starts a new hold from stopped as an idle solve', () => {
    const onSolveComplete = vi.fn()
    const { result } = renderHook(() =>
      useTimerMachine({ holdToStartMs: 0, inspectionEnabled: true, onSolveComplete }),
    )

    act(() => result.current.beginHold())
    act(() => result.current.releaseHold())
    act(() => result.current.beginHold())
    act(() => result.current.releaseHold())
    act(() => result.current.stopTimer())
    expect(result.current.status).toBe('stopped')

    act(() => result.current.beginHold())
    act(() => result.current.releaseHold())

    expect(result.current.status).toBe('inspection')
    expect(result.current.elapsedMs).toBe(0)
  })

  it('ignores stop and reset commands that do not match the current state', () => {
    const onSolveComplete = vi.fn()
    const { result } = renderHook(() =>
      useTimerMachine({ holdToStartMs: 0, inspectionEnabled: false, onSolveComplete }),
    )

    act(() => result.current.stopTimer())
    act(() => result.current.resetStopped())

    expect(result.current.status).toBe('idle')
    expect(onSolveComplete).not.toHaveBeenCalled()
  })

  it('runs WCA inspection and carries +2 penalty into the solve', () => {
    const onSolveComplete = vi.fn()
    const { result } = renderHook(() =>
      useTimerMachine({ holdToStartMs: 0, inspectionEnabled: true, onSolveComplete }),
    )

    act(() => result.current.beginHold())
    act(() => result.current.releaseHold())
    expect(result.current.status).toBe('inspection')

    act(() => vi.advanceTimersByTime(15_100))
    expect(result.current.inspectionPenalty).toBe('plus2')

    act(() => result.current.beginHold())
    act(() => result.current.releaseHold())
    expect(result.current.status).toBe('running')

    act(() => {
      vi.advanceTimersByTime(500)
      result.current.stopTimer()
    })

    expect(onSolveComplete).toHaveBeenCalledWith(expect.any(Number), 'plus2')
  })

  it('marks inspection as DNF after seventeen seconds', () => {
    const onSolveComplete = vi.fn()
    const { result } = renderHook(() =>
      useTimerMachine({ holdToStartMs: 0, inspectionEnabled: true, onSolveComplete }),
    )

    act(() => result.current.beginHold())
    act(() => result.current.releaseHold())
    act(() => vi.advanceTimersByTime(17_100))

    expect(result.current.inspectionPenalty).toBe('dnf')
    expect(result.current.inspectionRemainingMs).toBe(0)
  })

  it.each([
    'holding',
    'running',
  ] as const)('clears pending timers when unmounted while %s', (status) => {
    const onSolveComplete = vi.fn()
    const holdToStartMs = status === 'holding' ? 1_000 : 0
    const { result, unmount } = renderHook(() =>
      useTimerMachine({ holdToStartMs, inspectionEnabled: false, onSolveComplete }),
    )

    act(() => result.current.beginHold())
    if (status === 'running') {
      act(() => result.current.releaseHold())
    }

    expect(result.current.status).toBe(status)
    expect(vi.getTimerCount()).toBeGreaterThan(0)

    unmount()

    expect(vi.getTimerCount()).toBe(0)
  })
})
