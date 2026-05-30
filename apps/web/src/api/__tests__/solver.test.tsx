import { waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mockApiError, mockApiSuccess } from '@src/test/api'
import { renderHookWithProviders } from '@src/test/render'
import { analyzeScanFace } from '../scan/analyzeFace/analyzeFace'
import { useAnalyzeScanFace } from '../scan/analyzeFace/useAnalyzeScanFace'
import { getHealth } from '../solver/getHealth/getHealth'
import { useGetHealth } from '../solver/getHealth/useGetHealth'
import { getStrategies } from '../solver/getStrategies/getStrategies'
import { useGetStrategies } from '../solver/getStrategies/useGetStrategies'
import { solverQueryKeys } from '../solver/queryKeys'
import { normalizeSolveResponse } from '../solver/solveNotation/normalizeSolveResponse'
import { solveNotation } from '../solver/solveNotation/solveNotation'
import { useSolveNotation } from '../solver/solveNotation/useSolveNotation'
import { solveScan } from '../solver/solveScan/solveScan'
import { useSolveScan } from '../solver/solveScan/useSolveScan'
import type { ApiSolveResponse } from '../solver/types'

const successPayload: ApiSolveResponse = {
  generatedTableStatus: 'available',
  maxDepth: 2,
  maxNodes: 10_000_000,
  moves: ["U'", "R'"],
  ok: true,
  replayVerified: true,
  status: 'success',
  strategyId: 'generated-two-phase-quality',
  strategyLabel: 'Generated two-phase quality solver',
  solverMode: 'generated_two_phase_quality',
  elapsedMs: 12,
  exploredNodes: 42,
  length: 2,
}

describe('solver API operations', () => {
  it('exposes stable query keys', () => {
    expect(solverQueryKeys.health()).toEqual(['solver', 'health'])
    expect(solverQueryKeys.strategies()).toEqual(['solver', 'strategies'])
  })

  it('gets API health through the request client', async () => {
    const fetchMock = mockApiSuccess({ generatedTwoPhaseReady: true, ok: true })

    await expect(getHealth()).resolves.toEqual({ generatedTwoPhaseReady: true, ok: true })
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8787/health',
      expect.objectContaining({ headers: expect.any(Headers) }),
    )
  })

  it('gets solver strategies through the request client', async () => {
    const strategies = [
      {
        id: 'generated-two-phase-quality',
        label: 'Generated two-phase quality solver',
        solverMode: 'generated_two_phase_quality',
        statusText: 'ready',
      },
    ]
    mockApiSuccess(strategies)

    await expect(getStrategies()).resolves.toEqual(strategies)
  })

  it('normalizes successful solve responses', async () => {
    mockApiSuccess(successPayload)

    await expect(
      solveNotation({
        limits: { maxDepth: 2, maxNodes: 10_000_000, strategyId: 'generated-two-phase-quality' },
        notation: 'R U',
      }),
    ).resolves.toMatchObject({
      elapsedMs: 12,
      exploredNodes: 42,
      moves: ["U'", "R'"],
      ok: true,
      status: 'success',
    })
  })

  it('posts scanned faces through the request client', async () => {
    const fetchMock = mockApiSuccess(successPayload)
    const faces = {
      U: 'UUUUUUUUU',
      R: 'RRRRRRRRR',
      F: 'FFFFFFFFF',
      D: 'DDDDDDDDD',
      L: 'LLLLLLLLL',
      B: 'BBBBBBBBB',
    }

    await expect(
      solveScan({
        faces,
        limits: { maxDepth: 0, maxNodes: 1_000, strategyId: 'bounded-ida-star' },
      }),
    ).resolves.toMatchObject({ ok: true, status: 'success' })
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8787/solve-scan',
      expect.objectContaining({
        body: JSON.stringify({
          faces,
          maxDepth: 0,
          maxNodes: 1_000,
          strategyId: 'bounded-ida-star',
        }),
      }),
    )
  })

  it('posts scan photos for vision analysis through the request client', async () => {
    const payload = {
      ok: true,
      status: 'detected',
      centerMismatch: false,
      confidence: 1,
      faceQuad: [],
      stickers: [],
      warnings: [],
    }
    const fetchMock = mockApiSuccess(payload)

    await expect(
      analyzeScanFace({
        expectedCenter: 'U',
        image: 'data:image/jpeg;base64,scan',
        knownCenters: { U: { r: 205, g: 210, b: 218 } },
      }),
    ).resolves.toEqual(payload)
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8787/scan/analyze-face',
      expect.objectContaining({
        body: JSON.stringify({
          expectedCenter: 'U',
          image: 'data:image/jpeg;base64,scan',
          knownCenters: { U: { r: 205, g: 210, b: 218 } },
        }),
      }),
    )
  })

  it('defaults missing optional success metrics', () => {
    const { elapsedMs, exploredNodes, length } = normalizeSolveResponse(
      {
        ...successPayload,
        elapsedMs: undefined,
        exploredNodes: undefined,
        length: undefined,
      },
      true,
    ) as Extract<ReturnType<typeof normalizeSolveResponse>, { ok: true }>

    expect(elapsedMs).toBe(0)
    expect(exploredNodes).toBe(0)
    expect(length).toBe(successPayload.moves.length)
  })

  it('normalizes API failure responses without throwing', async () => {
    mockApiError({
      ...successPayload,
      message: 'Invalid scramble',
      ok: false,
      status: 'invalid_notation',
    })

    await expect(
      solveNotation({ limits: { maxDepth: 2 }, notation: 'R Q' }),
    ).resolves.toMatchObject({
      message: 'Invalid scramble',
      ok: false,
      status: 'invalid_notation',
    })
  })

  it('marks unverified successes as failures', () => {
    expect(
      normalizeSolveResponse({ ...successPayload, replayVerified: false }, true),
    ).toMatchObject({
      ok: false,
      status: 'unverified_solution',
    })
  })

  it('falls back to api_error for unknown statuses', () => {
    expect(
      normalizeSolveResponse({ ...successPayload, ok: false, status: 'unknown_status' }, false),
    ).toMatchObject({
      ok: false,
      status: 'api_error',
    })
  })
})

describe('solver React Query hooks', () => {
  it('loads health responses', async () => {
    mockApiSuccess({ generatedTwoPhaseReady: true, ok: true })
    const { result } = renderHookWithProviders(() => useGetHealth())

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ generatedTwoPhaseReady: true, ok: true })
  })

  it('respects disabled strategy queries', () => {
    const fetchMock = mockApiSuccess([])
    const { result } = renderHookWithProviders(() => useGetStrategies({ enabled: false }))

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('runs solve mutations', async () => {
    mockApiSuccess(successPayload)
    const { result } = renderHookWithProviders(() => useSolveNotation())

    await expect(
      result.current.mutateAsync({ limits: { maxDepth: 2 }, notation: 'R U' }),
    ).resolves.toMatchObject({ ok: true, status: 'success' })
  })

  it('runs scanned cube solve mutations', async () => {
    mockApiSuccess(successPayload)
    const { result } = renderHookWithProviders(() => useSolveScan())

    await expect(
      result.current.mutateAsync({
        faces: {
          U: 'UUUUUUUUU',
          R: 'RRRRRRRRR',
          F: 'FFFFFFFFF',
          D: 'DDDDDDDDD',
          L: 'LLLLLLLLL',
          B: 'BBBBBBBBB',
        },
        limits: { maxDepth: 0 },
      }),
    ).resolves.toMatchObject({ ok: true, status: 'success' })
  })

  it('runs scan analysis mutations', async () => {
    mockApiSuccess({
      ok: true,
      status: 'detected',
      centerMismatch: false,
      confidence: 1,
      faceQuad: [],
      stickers: [],
      warnings: [],
    })
    const { result } = renderHookWithProviders(() => useAnalyzeScanFace())

    await expect(
      result.current.mutateAsync({
        expectedCenter: 'U',
        image: 'data:image/jpeg;base64,scan',
        knownCenters: {},
      }),
    ).resolves.toMatchObject({ ok: true, status: 'detected' })
  })
})
