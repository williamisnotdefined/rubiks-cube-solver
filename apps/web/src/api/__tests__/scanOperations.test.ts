import { mockApiError, mockApiSuccess, mockFetchResponse } from '@src/test/api'
import { describe, expect, it, vi } from 'vitest'
import { analyzeScanFace } from '../scan/analyzeFace'
import { solveScanSession } from '../scan/solveSession'

const analysisPayload = {
  centerMismatch: false,
  confidence: 1,
  detectedCenterConfidence: 1,
  faceConfidence: 1,
  ok: true,
  qualityWarnings: [],
  status: 'detected',
  stickers: [],
  warnings: [],
}

const sessionPayload = {
  manualTargets: [],
  ok: true,
  rescanFaces: [],
  solve: {
    elapsedMs: null,
    errorKind: null,
    exploredNodes: 1,
    generatedTableStatus: 'available',
    length: 0,
    maxDepth: 20,
    maxNodes: null,
    message: null,
    moves: [],
    ok: true,
    replayVerified: true,
    status: 'success',
    strategyId: 'bounded-ida-star',
    strategyLabel: 'Bounded IDA*',
    solverMode: 'bounded_ida_star',
    visualState: null,
  },
  status: 'accepted',
}

const analyzedFaceVariables = {
  expectedCenter: 'U' as const,
  gridSize: 3 as const,
  image: 'data:image/jpeg;base64,scan',
}

const sessionVariables = {
  faces: [
    {
      clientRotation: 270 as const,
      expectedTop: 'F' as const,
      manualOverrides: { 0: 'R' as const },
      reviewedStickers: [{ confidence: 0.9, index: 0, source: 'manual', symbol: 'R' as const }],
      symbol: 'U' as const,
    },
  ],
  maxDepth: 20,
  maxNodes: 1_000,
  strategyId: 'bounded-ida-star',
}

describe('scan API operations', () => {
  it('posts complete face analysis inputs and returns a valid response', async () => {
    const fetchMock = mockApiSuccess(analysisPayload)

    await expect(analyzeScanFace(analyzedFaceVariables)).resolves.toEqual(analysisPayload)
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8787/scan/analyze-face',
      expect.objectContaining({
        body: JSON.stringify({
          expectedCenter: 'U',
          gridSize: 3,
          image: analyzedFaceVariables.image,
        }),
      }),
    )
  })

  it.each([
    0, 90, 180, 270,
  ] as const)('posts face symbols, sticker indices, and a %s-degree rotation unchanged', async (clientRotation) => {
    const fetchMock = mockApiSuccess(sessionPayload)
    const variables = {
      ...sessionVariables,
      faces: [{ ...sessionVariables.faces[0], clientRotation }],
    }

    await expect(solveScanSession(variables)).resolves.toMatchObject({
      ok: true,
      solve: { ok: true, status: 'success' },
      status: 'accepted',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8787/scan/solve-session',
      expect.objectContaining({
        body: JSON.stringify(variables),
      }),
    )
  })

  it('encodes puzzle slugs in scan-session paths', async () => {
    const fetchMock = mockApiSuccess(sessionPayload)

    await solveScanSession({ ...sessionVariables, puzzleSlug: 'cube/2x2 test' })

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8787/puzzles/cube%2F2x2%20test/scan/solve-session',
      expect.anything(),
    )
  })

  it.each([
    Number.NaN,
    Infinity,
    -Infinity,
    1.5,
    -1,
    4,
    45,
    360,
  ])('rejects the unsupported client rotation %s before transport', async (clientRotation) => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')

    await expect(
      solveScanSession({
        ...sessionVariables,
        faces: [{ ...sessionVariables.faces[0], clientRotation: clientRotation as never }],
      }),
    ).rejects.toThrow('clientRotation must be one of 0, 90, 180, 270')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    Number.NaN,
    Infinity,
    -Infinity,
    0.5,
    -1,
    4,
  ])('rejects the 2x2 reviewed sticker index %s before transport', async (index) => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')

    await expect(
      solveScanSession({
        ...sessionVariables,
        faces: [
          {
            ...sessionVariables.faces[0],
            reviewedStickers: [{ index, symbol: 'U' }],
          },
        ],
        puzzleSlug: 'cube-2x2x2',
      }),
    ).rejects.toThrow('reviewed sticker indexes must be integers in 0..3')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    'NaN',
    'Infinity',
    '-Infinity',
    '0.5',
    '-1',
    '4',
  ])('rejects the 2x2 manual override index %s before transport', async (index) => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')

    await expect(
      solveScanSession({
        ...sessionVariables,
        faces: [
          {
            ...sessionVariables.faces[0],
            manualOverrides: { [index]: 'U' as const },
          },
        ],
        puzzleSlug: 'cube-2x2x2',
      }),
    ).rejects.toThrow('manual override indexes must be integers in 0..3')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    Number.NaN,
    Infinity,
    -Infinity,
    2.5,
    -1,
    4,
  ])('rejects the invalid grid size %s before transport', async (gridSize) => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')

    await expect(
      analyzeScanFace({ ...analyzedFaceVariables, gridSize: gridSize as never }),
    ).rejects.toThrow('gridSize must be 2 or 3')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    ['face analysis', analyzeScanFace, analyzedFaceVariables],
    ['scan session', solveScanSession, sessionVariables],
  ] as const)('surfaces invalid JSON from the %s operation', async (_label, operation, variables) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{invalid', { status: 200, statusText: 'OK' }),
    )

    await expect(operation(variables as never)).rejects.toMatchObject({
      name: 'ApiResponseParseError',
      status: 200,
    })
  })

  it.each([
    [400, 'Invalid scan request'],
    [503, 'Scan service unavailable'],
  ])('maps face analysis HTTP %s errors with public messages', async (status, message) => {
    mockApiError({ message }, status)

    await expect(analyzeScanFace(analyzedFaceVariables)).rejects.toMatchObject({
      message,
      name: 'ApiRequestError',
      status,
    })
  })

  it.each([
    [400, ['Invalid face', '', 1, 'Invalid rotation'], 'Invalid face, Invalid rotation'],
    [500, 'Session service failed', 'Session service failed'],
  ])('maps scan-session HTTP %s errors with public messages', async (status, message, expected) => {
    mockApiError({ message }, status)

    await expect(solveScanSession(sessionVariables)).rejects.toMatchObject({
      message: expected,
      name: 'ApiRequestError',
      status,
    })
  })

  it.each([
    ['face analysis', analyzeScanFace, analyzedFaceVariables, analysisPayload],
    ['scan session', solveScanSession, sessionVariables, sessionPayload],
  ] as const)('rejects an ok %s domain payload returned with a failing HTTP status', async (_label, operation, variables, payload) => {
    mockFetchResponse(payload, { status: 500, statusText: '' })

    await expect(operation(variables as never)).rejects.toMatchObject({
      name: 'ApiRequestError',
      status: 500,
    })
  })

  it.each([
    ['face analysis', analyzeScanFace, analyzedFaceVariables],
    ['scan session', solveScanSession, sessionVariables],
  ] as const)('rejects a malformed %s payload', async (_label, operation, variables) => {
    mockApiSuccess({ ok: true, status: 'accepted' })

    await expect(operation(variables as never)).rejects.toMatchObject({
      name: 'ApiResponseValidationError',
    })
  })

  it.each([
    [
      'face analysis',
      analyzeScanFace,
      analyzedFaceVariables,
      { ...analysisPayload, ok: false, status: 'vision_error' },
    ],
    [
      'scan session',
      solveScanSession,
      sessionVariables,
      (() => {
        const { solve: _solve, ...payload } = sessionPayload
        return { ...payload, ok: false, status: 'vision_error' }
      })(),
    ],
  ] as const)('returns a valid %s domain failure from HTTP 500', async (_label, operation, variables, payload) => {
    mockApiError(payload, 500)

    await expect(operation(variables as never)).resolves.toEqual(payload)
  })
})
