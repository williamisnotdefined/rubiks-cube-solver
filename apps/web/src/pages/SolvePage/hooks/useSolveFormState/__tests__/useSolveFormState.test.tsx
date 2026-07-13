import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useSolveSettingsStore } from '../../../solve/solveSettingsStore'
import { useSolveFormState } from '../useSolveFormState'

describe('useSolveFormState', () => {
  beforeEach(() => {
    useSolveSettingsStore.getState().resetSolveSettings()
  })

  it('preserves an existing max-moves value when it is valid for the next puzzle', () => {
    useSolveSettingsStore.getState().setMaxMovesInput('10')
    const { result } = renderHook(() => useSolveFormState())

    act(() => {
      result.current.updateSelectedPuzzleSlug('cube-2x2x2')
    })

    expect(result.current.selectedPuzzleSlug).toBe('cube-2x2x2')
    expect(result.current.maxMovesInput).toBe('10')
    expect(useSolveSettingsStore.getState().maxMovesInput).toBe('10')
  })
})
