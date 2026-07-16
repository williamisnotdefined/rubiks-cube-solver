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
    apiMocks.useGetHealth.mockReturnValue(queryState({ isPending: true }))
    apiMocks.useGetPuzzles.mockReturnValue(queryState({ isPending: true }))
    apiMocks.useGetPuzzleStrategies.mockReturnValue(queryState({ isPending: true }))
  })

  it('returns loading fallbacks while puzzle data is undefined', () => {
    const { result } = renderHook(() => useSolvePuzzleMetadata('cube-3x3x3'))

    expect(apiMocks.useGetPuzzleStrategies).toHaveBeenCalledWith({
      enabled: false,
      puzzleSlug: 'cube-3x3x3',
    })
    expect(result.current).toMatchObject({
      apiReady: false,
      health: undefined,
      puzzleOptions: [],
      scanAvailable: false,
      status: 'loading',
      strategyId: 'generated-two-phase',
      strategyOptions: [],
      visualizationCubeType: undefined,
      visualizationSupported: false,
    })
    expect(result.current.retry).toEqual(expect.any(Function))
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
    apiMocks.useGetHealth.mockReturnValue(queryState({ data: { ok: true } }))
    apiMocks.useGetPuzzles.mockReturnValue(queryState({ data: [puzzle] }))
    apiMocks.useGetPuzzleStrategies.mockReturnValue(queryState({ data: [] }))

    const { result } = renderHook(() => useSolvePuzzleMetadata('pyraminx'))

    expect(result.current).toMatchObject({
      apiReady: true,
      puzzleOptions: [puzzle],
      scanAvailable: false,
      status: 'ready',
      visualizationCubeType: undefined,
      visualizationSupported: false,
    })
  })

  it('distinguishes errors from unavailable metadata and retries enabled resources', async () => {
    const healthRefetch = vi.fn().mockResolvedValue(undefined)
    const puzzlesRefetch = vi.fn().mockResolvedValue(undefined)
    const strategiesRefetch = vi.fn().mockResolvedValue(undefined)
    apiMocks.useGetHealth.mockReturnValue(
      queryState({
        data: { ok: false },
        refetch: healthRefetch,
      }),
    )
    apiMocks.useGetPuzzles.mockReturnValue(queryState({ refetch: puzzlesRefetch }))
    apiMocks.useGetPuzzleStrategies.mockReturnValue(queryState({ refetch: strategiesRefetch }))

    const { result, rerender } = renderHook(() => useSolvePuzzleMetadata('missing'))

    expect(result.current.status).toBe('unavailable')
    await result.current.retry()
    expect(healthRefetch).toHaveBeenCalledOnce()
    expect(puzzlesRefetch).toHaveBeenCalledOnce()
    expect(strategiesRefetch).not.toHaveBeenCalled()

    apiMocks.useGetHealth.mockReturnValue(queryState({ isError: true }))
    rerender()
    expect(result.current.status).toBe('error')
  })
})

function queryState({
  data,
  isError = false,
  isPending = false,
  refetch = vi.fn().mockResolvedValue(undefined),
}: {
  data?: unknown
  isError?: boolean
  isPending?: boolean
  refetch?: ReturnType<typeof vi.fn>
} = {}) {
  return { data, isError, isPending, isSuccess: !isError && !isPending, refetch }
}
