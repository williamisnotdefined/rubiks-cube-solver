import { waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mockApiError, mockApiSuccess } from '@src/test/api'
import { renderHookWithProviders } from '@src/test/render'
import { analyzeScanFace } from '../scan/analyzeFace/analyzeFace'
import { solveScanSession } from '../scan/solveSession/solveSession'
import { useAnalyzeScanFace } from '../scan/analyzeFace/useAnalyzeScanFace'
import { useSolveScanSession } from '../scan/solveSession/useSolveScanSession'
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

const scanSessionFaces = [
  { symbol: 'U', image: 'data:image/jpeg;base64,U' },
  { symbol: 'R', image: 'data:image/jpeg;base64,R' },
  { symbol: 'F', image: 'data:image/jpeg;base64,F' },
  { symbol: 'D', image: 'data:image/jpeg;base64,D' },
  { symbol: 'L', image: 'data:image/jpeg;base64,L' },
  { symbol: 'B', image: 'data:image/jpeg;base64,B' },
] as const

describe('solver API operations', () => {
  it('exposes stable query keys', () => {
    expect(solverQueryKeys.health()).toEqual(['solver', 'health'])
    expect(solverQueryKeys.strategies()).toEqual(['solver', 'strategies'])
  })

  it('gets API health through the request client', async () => {
    const health = {
      generatedTwoPhaseReady: true,
      ok: true,
      visionCnnAvailable: false,
      visionCnnReason: 'cnn_model_not_configured',
      visionFaceDetectorAvailable: false,
      visionFaceDetectorReason: 'face_detector_model_not_configured',
      visionOk: true,
    }
    const fetchMock = mockApiSuccess(health)

    await expect(getHealth()).resolves.toEqual(health)
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
      detectedCenterConfidence: 1,
      detectionMode: 'contour',
      faceConfidence: 1,
      faceQuad: [],
      qualityWarnings: [],
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

  it('posts scan sessions through the request client', async () => {
    const payload = {
      inference: {
        candidateFacelets: 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB',
        manualTargets: [],
        qualityReasons: [],
        rescanFaces: [],
        stateConfidence: 1,
        status: 'accepted',
      },
      manualTargets: [],
      ok: true,
      rescanFaces: [],
      solve: successPayload,
      status: 'accepted',
      timings: {
        earlyQualityGateElapsedMs: 1,
        inferenceElapsedMs: 2,
        qualityGateElapsedMs: 1,
        solveElapsedMs: 3,
        totalElapsedMs: 12,
        visionElapsedMs: 5,
      },
    }
    const fetchMock = mockApiSuccess(payload)

    await expect(
      solveScanSession({
        faces: [...scanSessionFaces],
        maxDepth: 0,
        maxNodes: 1_000,
        strategyId: 'bounded-ida-star',
      }),
    ).resolves.toEqual(payload)
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8787/scan/solve-session',
      expect.objectContaining({
        body: JSON.stringify({
          faces: [...scanSessionFaces],
          maxDepth: 0,
          maxNodes: 1_000,
          strategyId: 'bounded-ida-star',
        }),
      }),
    )
  })

  it('returns scan session API failures without throwing', async () => {
    const payload = {
      manualTargets: [],
      message: 'One or more faces need to be rescanned.',
      ok: false,
      rescanFaces: ['F'],
      status: 'needs_rescan_face',
      timings: {
        earlyQualityGateElapsedMs: 1,
        totalElapsedMs: 8,
        visionElapsedMs: 7,
      },
    }
    mockApiError(payload)

    await expect(
      solveScanSession({
        faces: [...scanSessionFaces],
        maxDepth: 0,
      }),
    ).resolves.toEqual(payload)
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
    mockApiSuccess({
      generatedTwoPhaseReady: true,
      ok: true,
      visionCnnAvailable: true,
      visionFaceDetectorAvailable: true,
      visionOk: true,
    })
    const { result } = renderHookWithProviders(() => useGetHealth())

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({
      generatedTwoPhaseReady: true,
      ok: true,
      visionCnnAvailable: true,
      visionFaceDetectorAvailable: true,
      visionOk: true,
    })
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
      detectedCenterConfidence: 1,
      detectionMode: 'contour',
      faceConfidence: 1,
      faceQuad: [],
      qualityWarnings: [],
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

  it('runs scan session mutations', async () => {
    mockApiSuccess({
      inference: {
        candidateFacelets: 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB',
        manualTargets: [],
        qualityReasons: [],
        rescanFaces: [],
        stateConfidence: 1,
        status: 'accepted',
      },
      manualTargets: [],
      ok: true,
      rescanFaces: [],
      solve: successPayload,
      status: 'accepted',
    })
    const { result } = renderHookWithProviders(() => useSolveScanSession())

    await expect(
      result.current.mutateAsync({
        faces: [...scanSessionFaces],
        maxDepth: 0,
      }),
    ).resolves.toMatchObject({ ok: true, status: 'accepted' })
  })
})
