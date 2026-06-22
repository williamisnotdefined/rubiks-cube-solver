import { waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mockApiError, mockApiSuccess, mockFetchResponse } from '@src/test/api'
import { renderHookWithProviders } from '@src/test/render'
import { apiRequest } from '../client'
import { analyzeScanFace } from '../scan/analyzeFace/analyzeFace'
import { solveScanSession } from '../scan/solveSession/solveSession'
import type { ScanSessionFaceRequest } from '../scan/types'
import { useAnalyzeScanFace } from '../scan/analyzeFace/useAnalyzeScanFace'
import { useSolveScanSession } from '../scan/solveSession/useSolveScanSession'
import { getHealth } from '../solver/getHealth/getHealth'
import { useGetHealth } from '../solver/getHealth/useGetHealth'
import { getPuzzles } from '../solver/getPuzzles/getPuzzles'
import { useGetPuzzles } from '../solver/getPuzzles/useGetPuzzles'
import { getPuzzleStrategies } from '../solver/getPuzzleStrategies/getPuzzleStrategies'
import { useGetPuzzleStrategies } from '../solver/getPuzzleStrategies/useGetPuzzleStrategies'
import { getStrategies } from '../solver/getStrategies/getStrategies'
import { useGetStrategies } from '../solver/getStrategies/useGetStrategies'
import { solverQueryKeys } from '../solver/queryKeys'
import { normalizeSolveResponse } from '../solver/solveNotation/normalizeSolveResponse'
import { solveNotation } from '../solver/solveNotation/solveNotation'
import { useSolveNotation } from '../solver/solveNotation/useSolveNotation'
import { solvePuzzleNotation } from '../solver/solvePuzzleNotation/solvePuzzleNotation'
import { useSolvePuzzleNotation } from '../solver/solvePuzzleNotation/useSolvePuzzleNotation'
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

const scanSessionSymbols = [
  'U',
  'R',
  'F',
  'D',
  'L',
  'B',
] as const

const scanSessionFaces: ScanSessionFaceRequest[] = scanSessionSymbols.map((symbol) => ({
  reviewedStickers: Array.from({ length: 9 }, (_, index) => ({
    confidence: 1,
    index,
    source: index === 4 ? 'center' as const : 'detected' as const,
    symbol,
  })),
  symbol,
}))

describe('solver API operations', () => {
  it('uses response status text when error payloads have no message', async () => {
    mockFetchResponse(null, { status: 502, statusText: 'Bad Gateway' })

    await expect(apiRequest('/broken')).rejects.toMatchObject({ message: 'Bad Gateway' })
  })

  it('ignores empty message arrays in error payloads', async () => {
    mockFetchResponse({ message: ['', 123] }, { status: 400, statusText: 'Bad Request' })

    await expect(apiRequest('/broken')).rejects.toMatchObject({ message: 'Bad Request' })
  })

  it('exposes stable query keys', () => {
    expect(solverQueryKeys.health()).toEqual(['solver', 'health'])
    expect(solverQueryKeys.puzzles()).toEqual(['solver', 'puzzles'])
    expect(solverQueryKeys.puzzleStrategies('cube-2x2x2')).toEqual([
      'solver',
      'puzzles',
      'cube-2x2x2',
      'strategies',
    ])
    expect(solverQueryKeys.strategies()).toEqual(['solver', 'strategies'])
  })

  it('gets API health through the request client', async () => {
    const health = {
      generatedTwoPhaseReady: true,
      ok: true,
      visionTileDetectorAvailable: false,
      visionTileDetectorReason: 'tile_detector_model_not_configured',
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

  it('gets puzzle metadata through the request client', async () => {
    const puzzles = [
      {
        id: 'cube/2x2x2',
        slug: 'cube-2x2x2',
        label: '2x2x2 Cube',
        family: 'cube',
        status: 'experimental',
        defaultMetric: 'htm',
        supportedInputs: ['notation'],
        supportedVisualizations: ['cube2-facelets-v1'],
        defaultStrategyId: 'cube2-pdb-ida-star',
        strategyIds: ['cube2-bounded-ida-star', 'cube2-pdb-ida-star'],
        scannerSupported: true,
      },
    ]
    mockApiSuccess(puzzles)

    await expect(getPuzzles()).resolves.toEqual(puzzles)
  })

  it('gets puzzle strategies through the request client', async () => {
    const strategies = [
      {
        id: 'cube2-pdb-ida-star',
        puzzleId: 'cube/2x2x2',
        label: '2x2 PDB IDA*',
        solverMode: 'cube2_pdb_ida_star',
        statusText: 'Experimental 2x2 solver with in-memory PDB heuristic',
        defaultMetric: 'htm',
        supportedMetrics: ['htm'],
        supportedInputs: ['notation', 'scan2x2'],
      },
    ]
    const fetchMock = mockApiSuccess(strategies)

    await expect(getPuzzleStrategies('cube-2x2x2')).resolves.toEqual(strategies)
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8787/puzzles/cube-2x2x2/strategies',
      expect.objectContaining({ headers: expect.any(Headers) }),
    )
  })

  it('normalizes successful solve responses', async () => {
    mockApiSuccess(successPayload)

    await expect(
      solveNotation({
        limits: { maxDepth: 2, maxNodes: 10_000_000, strategyId: 'generated-two-phase-quality' },
        notation: 'R U',
      }),
    ).resolves.toMatchObject({
      exploredNodes: 42,
      moves: ["U'", "R'"],
      ok: true,
      requestElapsedMs: expect.any(Number),
      status: 'success',
    })
  })

  it('normalizes puzzle-aware 3x3 visual states', async () => {
    mockApiSuccess({
      ...successPayload,
      puzzleId: 'cube/3x3x3',
      puzzleSlug: 'cube-3x3x3',
      visualState: {
        kind: 'cube3-facelets-v1',
        value: 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB',
      },
    })

    await expect(
      solvePuzzleNotation({
        limits: { maxDepth: 2, strategyId: 'bounded-ida-star' },
        notation: 'F',
        puzzleSlug: 'cube-3x3x3',
      }),
    ).resolves.toMatchObject({
      ok: true,
      puzzleSlug: 'cube-3x3x3',
      requestElapsedMs: expect.any(Number),
      visualState: 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB',
      visualStateKind: 'cube3-facelets-v1',
    })
  })

  it('posts puzzle-aware 2x2 solve requests and ignores null visual states', async () => {
    const fetchMock = mockApiSuccess({
      ...successPayload,
      generatedTableStatus: 'not_applicable',
      moves: ["F'"],
      puzzleId: 'cube/2x2x2',
      puzzleSlug: 'cube-2x2x2',
      strategyId: 'cube2-pdb-ida-star',
      strategyLabel: '2x2 PDB IDA*',
      solverMode: 'cube2_pdb_ida_star',
      visualState: null,
    })

    await expect(
      solvePuzzleNotation({
        limits: { maxDepth: 1, maxNodes: 1_000, strategyId: 'cube2-pdb-ida-star' },
        notation: 'F',
        puzzleSlug: 'cube-2x2x2',
      }),
    ).resolves.toMatchObject({
      generatedTableStatus: 'not_applicable',
      ok: true,
      puzzleSlug: 'cube-2x2x2',
      requestElapsedMs: expect.any(Number),
      visualState: undefined,
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8787/puzzles/cube-2x2x2/solve',
      expect.objectContaining({
        body: JSON.stringify({
          input: { kind: 'notation', value: 'F' },
          limits: { maxDepth: 1, maxNodes: 1_000 },
          metric: 'htm',
          strategyId: 'cube2-pdb-ida-star',
        }),
      }),
    )
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
      detectionMode: 'tile_detector',
      faceConfidence: 1,
      qualityWarnings: [],
      stickers: [],
      warnings: [],
    }
    const fetchMock = mockApiSuccess(payload)
    const controller = new AbortController()

    await expect(
      analyzeScanFace({
        expectedCenter: 'U',
        image: 'data:image/jpeg;base64,scan',
        signal: controller.signal,
      }),
    ).resolves.toMatchObject(payload)
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8787/scan/analyze-face',
      expect.objectContaining({
        body: JSON.stringify({
          expectedCenter: 'U',
          image: 'data:image/jpeg;base64,scan',
        }),
        signal: controller.signal,
      }),
    )
  })

  it('falls back when scan analysis returns no JSON payload', async () => {
    mockApiSuccess(undefined)

    await expect(
      analyzeScanFace({
        expectedCenter: 'U',
        image: 'data:image/jpeg;base64,scan',
      }),
    ).resolves.toMatchObject({
      message: 'The scan analysis request failed.',
      ok: false,
      status: 'vision_error',
    })

    mockFetchResponse(undefined, { status: 503 })

    await expect(
      analyzeScanFace({
        expectedCenter: 'U',
        image: 'data:image/jpeg;base64,scan',
      }),
    ).resolves.toMatchObject({ ok: false, status: 'vision_unavailable' })
  })

  it('posts scan sessions through the request client', async () => {
    const payload = {
      manualTargets: [],
      ok: true,
      rescanFaces: [],
      solve: successPayload,
      status: 'accepted',
      timings: {
        solveElapsedMs: 3,
        totalElapsedMs: 12,
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
    ).resolves.toMatchObject({
      manualTargets: [],
      ok: true,
      rescanFaces: [],
      solve: {
        exploredNodes: 42,
        ok: true,
        requestElapsedMs: expect.any(Number),
        status: 'success',
      },
      status: 'accepted',
      timings: payload.timings,
    })
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

  it('posts puzzle-aware scan sessions through the request client', async () => {
    const payload = {
      manualTargets: [],
      ok: true,
      rescanFaces: [],
      solve: successPayload,
      status: 'accepted',
    }
    const fetchMock = mockApiSuccess(payload)

    await expect(
      solveScanSession({
        faces: [...scanSessionFaces],
        maxDepth: 0,
        puzzleSlug: 'cube-2x2x2',
        strategyId: 'cube2-pdb-ida-star',
      }),
    ).resolves.toMatchObject({
      manualTargets: [],
      ok: true,
      rescanFaces: [],
      solve: {
        ok: true,
        requestElapsedMs: expect.any(Number),
        status: 'success',
      },
      status: 'accepted',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8787/puzzles/cube-2x2x2/scan/solve-session',
      expect.objectContaining({
        body: JSON.stringify({
          faces: [...scanSessionFaces],
          maxDepth: 0,
          strategyId: 'cube2-pdb-ida-star',
        }),
      }),
    )
  })

  it('normalizes nested 2x2 scan solve visual states', async () => {
    mockApiSuccess({
      manualTargets: [],
      ok: true,
      rescanFaces: [],
      solve: {
        ...successPayload,
        generatedTableStatus: 'not_applicable',
        strategyId: 'cube2-pdb-ida-star',
        strategyLabel: '2x2 PDB IDA*',
        solverMode: 'cube2_pdb_ida_star',
        visualState: {
          kind: 'cube2-facelets-v1',
          value: 'UUUURRRRFFFFDDDDLLLLBBBB',
        },
      },
      status: 'accepted',
    })

    await expect(
      solveScanSession({
        faces: [...scanSessionFaces],
        maxDepth: 0,
        puzzleSlug: 'cube-2x2x2',
        strategyId: 'cube2-pdb-ida-star',
      }),
    ).resolves.toMatchObject({
      solve: {
        visualState: 'UUUURRRRFFFFDDDDLLLLBBBB',
        visualStateKind: 'cube2-facelets-v1',
      },
    })
  })

  it('falls back when scan sessions return no JSON payload', async () => {
    mockApiSuccess(undefined)

    await expect(
      solveScanSession({
        faces: [...scanSessionFaces],
        maxDepth: 0,
      }),
    ).resolves.toMatchObject({
      message: 'The scan session request failed.',
      ok: false,
      status: 'api_error',
    })

    mockFetchResponse(undefined, { status: 503 })

    await expect(
      solveScanSession({
        faces: [...scanSessionFaces],
        maxDepth: 0,
      }),
    ).resolves.toMatchObject({ ok: false, status: 'vision_unavailable' })
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

  it('uses request elapsed time and defaults missing optional success metrics', () => {
    const { exploredNodes, length, requestElapsedMs } = normalizeSolveResponse(
      {
        ...successPayload,
        elapsedMs: undefined,
        exploredNodes: undefined,
        length: undefined,
      },
      true,
      27_000,
    ) as Extract<ReturnType<typeof normalizeSolveResponse>, { ok: true }>

    expect(exploredNodes).toBe(0)
    expect(length).toBe(successPayload.moves.length)
    expect(requestElapsedMs).toBe(27_000)
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

  it('normalizes 2x2 node-limit failures', () => {
    expect(
      normalizeSolveResponse(
        {
          ...successPayload,
          generatedTableStatus: 'not_applicable',
          ok: false,
          status: 'node_limit_exceeded',
          errorKind: 'node_limit_exceeded',
          message: 'node cap reached',
          visualState: null,
        },
        true,
        0,
      ),
    ).toMatchObject({
      generatedTableStatus: 'not_applicable',
      ok: false,
      status: 'node_limit_exceeded',
      visualState: undefined,
    })
  })

  it('marks unverified successes as failures', () => {
    expect(
      normalizeSolveResponse({ ...successPayload, replayVerified: false }, true, 0),
    ).toMatchObject({
      ok: false,
      status: 'unverified_solution',
    })
  })

  it('falls back to api_error for unknown statuses', () => {
    expect(
      normalizeSolveResponse({ ...successPayload, ok: false, status: 'unknown_status' }, false, 0),
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
      visionTileDetectorAvailable: true,
      visionOk: true,
    })
    const { result } = renderHookWithProviders(() => useGetHealth())

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({
      generatedTwoPhaseReady: true,
      ok: true,
      visionTileDetectorAvailable: true,
      visionOk: true,
    })
  })

  it('respects disabled strategy queries', () => {
    const fetchMock = mockApiSuccess([])
    const { result } = renderHookWithProviders(() => useGetStrategies({ enabled: false }))

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('loads puzzle metadata responses', async () => {
    mockApiSuccess([])
    const { result } = renderHookWithProviders(() => useGetPuzzles())

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })

  it('respects disabled puzzle strategy queries', () => {
    const fetchMock = mockApiSuccess([])
    const { result } = renderHookWithProviders(() =>
      useGetPuzzleStrategies({ enabled: false, puzzleSlug: 'cube-2x2x2' }),
    )

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('loads puzzle strategy responses through the hook', async () => {
    mockApiSuccess([
      {
        defaultMetric: 'htm',
        id: 'cube2-pdb-ida-star',
        label: '2x2 PDB IDA*',
        puzzleId: 'cube/2x2x2',
        solverMode: 'cube2_pdb_ida_star',
        statusText: 'Experimental 2x2 solver',
        supportedInputs: ['notation'],
        supportedMetrics: ['htm'],
      },
    ])
    const { result } = renderHookWithProviders(() =>
      useGetPuzzleStrategies({ puzzleSlug: 'cube-2x2x2' }),
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([
      expect.objectContaining({ id: 'cube2-pdb-ida-star', puzzleId: 'cube/2x2x2' }),
    ])
  })

  it('runs solve mutations', async () => {
    mockApiSuccess(successPayload)
    const { result } = renderHookWithProviders(() => useSolveNotation())

    await expect(
      result.current.mutateAsync({ limits: { maxDepth: 2 }, notation: 'R U' }),
    ).resolves.toMatchObject({ ok: true, status: 'success' })
  })

  it('runs puzzle-aware solve mutations', async () => {
    mockApiSuccess({
      ...successPayload,
      generatedTableStatus: 'not_applicable',
      puzzleSlug: 'cube-2x2x2',
      visualState: null,
    })
    const { result } = renderHookWithProviders(() => useSolvePuzzleNotation())

    await expect(
      result.current.mutateAsync({
        limits: { maxDepth: 1, strategyId: 'cube2-pdb-ida-star' },
        notation: 'F',
        puzzleSlug: 'cube-2x2x2',
      }),
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
      detectionMode: 'tile_detector',
      faceConfidence: 1,
      qualityWarnings: [],
      stickers: [],
      warnings: [],
    })
    const { result } = renderHookWithProviders(() => useAnalyzeScanFace())

    await expect(
      result.current.mutateAsync({
        expectedCenter: 'U',
        image: 'data:image/jpeg;base64,scan',
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
