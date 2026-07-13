import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PuzzleDefinition } from '@api/solver/types'
import { useSolvePuzzleMetadata } from '../useSolvePuzzleMetadata'

const apiMocks = vi.hoisted(() => ({
  useGetHealth: vi.fn(),
  useGetPuzzles: vi.fn(),
  useGetPuzzleStrategies: vi.fn(),
}))

vi.mock('@api/solver', () => apiMocks)

describe('useSolvePuzzleMetadata', () => {
  beforeEach(() => {
    apiMocks.useGetHealth.mockReturnValue({ data: undefined })
    apiMocks.useGetPuzzles.mockReturnValue({ data: undefined, isSuccess: false })
    apiMocks.useGetPuzzleStrategies.mockReturnValue({ data: undefined, isSuccess: false })
  })

  it('returns loading fallbacks while puzzle data is undefined', () => {
    const { result } = renderHook(() => useSolvePuzzleMetadata('cube-3x3x3'))

    expect(apiMocks.useGetPuzzleStrategies).toHaveBeenCalledWith({
      enabled: true,
      puzzleSlug: 'cube-3x3x3',
    })
    expect(result.current).toEqual({
      apiReady: false,
      health: undefined,
      puzzleOptions: [],
      scanAvailable: false,
      strategyId: 'generated-two-phase',
      strategyOptions: [],
      visualizationCubeType: undefined,
      visualizationSupported: false,
    })
  })

  it('keeps an available puzzle usable when its visualization kind is unsupported', () => {
    const puzzle: PuzzleDefinition = {
      defaultMetric: 'htm',
      family: 'pyraminx',
      id: 'pyraminx',
      label: 'Pyraminx',
      scannerSupported: false,
      slug: 'pyraminx',
      status: 'planned',
      strategyIds: [],
      supportedInputs: ['notation'],
      supportedVisualizations: ['none'],
    }
    apiMocks.useGetHealth.mockReturnValue({ data: { ok: true } })
    apiMocks.useGetPuzzles.mockReturnValue({ data: [puzzle], isSuccess: true })
    apiMocks.useGetPuzzleStrategies.mockReturnValue({ data: [], isSuccess: true })

    const { result } = renderHook(() => useSolvePuzzleMetadata('pyraminx'))

    expect(result.current).toMatchObject({
      apiReady: true,
      puzzleOptions: [puzzle],
      scanAvailable: false,
      visualizationCubeType: undefined,
      visualizationSupported: false,
    })
  })
})
