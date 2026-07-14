import { act, renderHook } from '@testing-library/react'
import type { SolveSuccessResult } from '@api/solver/types'
import { describe, expect, it } from 'vitest'
import { useSolutionPlayback } from '../useSolutionPlayback'

describe('useSolutionPlayback', () => {
  it('falls back to an empty playback when there is no solve result', () => {
    const { result } = renderHook(() => useSolutionPlayback())

    act(() => {
      result.current.onSolutionStepChange(3)
    })

    expect(result.current.visibleSolutionStep).toBe(0)
    expect(result.current.visibleSolutionMoves).toEqual([])
  })

  it('resets the step when the solve result changes', () => {
    const firstResult = { moves: ['R', 'U'] } as SolveSuccessResult
    const secondResult = { moves: ["F'"] } as SolveSuccessResult
    const { result, rerender } = renderHook(({ solveResult }) => useSolutionPlayback(solveResult), {
      initialProps: { solveResult: firstResult },
    })

    act(() => {
      result.current.onSolutionStepChange(2)
    })
    rerender({ solveResult: secondResult })

    expect(result.current.visibleSolutionStep).toBe(0)
    expect(result.current.visibleSolutionMoves).toEqual([])
  })
})
