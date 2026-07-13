import { act, renderHook } from '@testing-library/react'
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
})
