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
})
