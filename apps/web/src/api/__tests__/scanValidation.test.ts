import { describe, expect, it } from 'vitest'
import {
  genericApiErrorMessage,
  parseAnalyzeScanFaceResponse,
  parseScanSessionResult,
} from '../scan/validation'

const faceSymbols = ['U', 'R', 'F', 'D', 'L', 'B'] as const

function minimalFacePayload() {
  return {
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
}

function completeFacePayload() {
  return {
    ...minimalFacePayload(),
    detectedCenter: 'U',
    detectionMode: 'tile_detector',
    expectedCenter: 'U',
    imageQuality: {
      blurScore: 0.1,
      glareRatio: 0.2,
      meanLuminance: 128,
      shadowRatio: 0.3,
    },
    imageSize: { height: 480, width: 640 },
    message: 'Face detected.',
    qualityWarnings: ['slight_glare'],
    stickers: [
      {
        alternatives: [{ confidence: 0.08, symbol: 'R' }],
        confidence: 0.92,
        index: 0,
        polygon: [
          { x: 1, y: 2 },
          { x: 3, y: 4 },
        ],
        probabilities: { B: 0, D: 0, F: 0, L: 0, R: 0.08, U: 0.92 },
        quality: {
          colorVariance: 0.1,
          glareRatio: 0.2,
          margin: 0.84,
          shadowRatio: 0.3,
        },
        rgb: { b: 240, g: 245, r: 250 },
        symbol: 'U',
      },
    ],
    tileDetections: [
      {
        bbox: { height: 20, width: 20, x: 1, y: 2 },
        confidence: 0.9,
        symbol: 'face',
      },
      {
        bbox: { height: 10, width: 10, x: 3, y: 4 },
        confidence: 0.8,
        symbol: 'U',
      },
    ],
    warnings: ['review_edge'],
  }
}

function solvePayload() {
  return {
    elapsedMs: null,
    errorKind: null,
    exploredNodes: 12,
    generatedTableStatus: 'available',
    length: 1,
    maxDepth: 20,
    maxNodes: null,
    message: null,
    moves: ["R'"],
    ok: true,
    replayVerified: true,
    status: 'success',
    strategyId: 'generated-two-phase-quality',
    strategyLabel: 'Generated two-phase quality solver',
    solverMode: 'generated_two_phase_quality',
    visualState: null,
  }
}

function minimalSessionPayload() {
  return {
    manualTargets: [],
    ok: true,
    rescanFaces: [],
    solve: solvePayload(),
    status: 'accepted',
  }
}

function completeSessionPayload() {
  return {
    ...minimalSessionPayload(),
    inference: {
      candidateFacelets: 'UUUURRRRFFFFDDDDLLLLBBBB',
      manualTargets: [{ face: 'F', stickers: [0, 3] }],
      margin: 0.4,
      qualityReasons: ['low_margin'],
      rescanFaces: ['B'],
      stateConfidence: 0.96,
      status: 'accepted',
    },
    invalidCorners: [
      {
        faces: ['U', 'R', 'F'],
        position: 'URF',
        reason: 'unknown_corner',
        stickers: ['U', 'R', 'F'],
        targets: [{ face: 'U', index: 8 }],
      },
    ],
    manualTargets: [{ face: 'U', stickers: [0, 8] }],
    message: 'Session accepted.',
    rescanFaces: ['L'],
    scan: {
      faces: [
        {
          analysis: completeFacePayload(),
          expectedTop: 'F',
          symbol: 'U',
        },
      ],
      message: 'All faces analyzed.',
      ok: true,
      status: 'analyzed',
      warnings: ['reviewed'],
    },
    solve: solvePayload(),
    timings: {
      earlyQualityGateElapsedMs: 2,
      inferenceElapsedMs: 3,
      qualityGateElapsedMs: 4,
      solveElapsedMs: 5,
      totalElapsedMs: 20,
      visionElapsedMs: 6,
    },
  }
}

function expectInvalid(parser: (value: unknown) => unknown, value: unknown, resource: string) {
  expect(() => parser(value)).toThrowError(
    expect.objectContaining({
      message: `API returned an invalid ${resource} response`,
      name: 'ApiResponseValidationError',
    }),
  )
}

describe('scan face response validation', () => {
  it('accepts and preserves the complete public payload', () => {
    const payload = completeFacePayload()

    expect(parseAnalyzeScanFaceResponse(payload)).toEqual(payload)
  })

  it('accepts the minimum valid payload', () => {
    expect(parseAnalyzeScanFaceResponse(minimalFacePayload())).toEqual(minimalFacePayload())
  })

  it('normalizes nullable Serde fields without changing nullable detectionMode', () => {
    const payload = {
      ...minimalFacePayload(),
      detectedCenter: null,
      detectionMode: null,
      expectedCenter: null,
      imageSize: null,
      message: null,
    }

    expect(parseAnalyzeScanFaceResponse(payload)).toEqual({
      ...payload,
      detectedCenter: undefined,
      expectedCenter: undefined,
      imageSize: undefined,
      message: undefined,
    })
  })

  it.each([
    'center_mismatch',
    'face_not_found',
    'low_confidence',
    'invalid_image',
    'request_too_large',
    'vision_unavailable',
    'vision_error',
  ])('accepts the stable %s failure status', (status) => {
    const payload = { ...minimalFacePayload(), ok: false, status }

    expect(parseAnalyzeScanFaceResponse(payload)).toMatchObject({ ok: false, status })
  })

  it.each([
    ['non-object root', null],
    ['array root', []],
    ['missing ok', { ...minimalFacePayload(), ok: undefined }],
    ['wrong ok type', { ...minimalFacePayload(), ok: 'true' }],
    ['missing status', { ...minimalFacePayload(), status: undefined }],
    ['wrong message type', { ...minimalFacePayload(), message: 1 }],
    ['wrong centerMismatch type', { ...minimalFacePayload(), centerMismatch: 0 }],
    ['invalid detected center', { ...minimalFacePayload(), detectedCenter: 'X' }],
    ['invalid expected center', { ...minimalFacePayload(), expectedCenter: 'X' }],
    ['wrong detection mode type', { ...minimalFacePayload(), detectionMode: 1 }],
    ['missing confidence', { ...minimalFacePayload(), confidence: undefined }],
    ['NaN confidence', { ...minimalFacePayload(), confidence: Number.NaN }],
    ['infinite center confidence', { ...minimalFacePayload(), detectedCenterConfidence: Infinity }],
    ['infinite face confidence', { ...minimalFacePayload(), faceConfidence: -Infinity }],
    ['wrong image size type', { ...minimalFacePayload(), imageSize: [] }],
    ['invalid image width', { ...minimalFacePayload(), imageSize: { height: 1, width: '1' } }],
    [
      'invalid image height',
      { ...minimalFacePayload(), imageSize: { height: Infinity, width: 1 } },
    ],
    [
      'invalid image blur score',
      {
        ...minimalFacePayload(),
        imageQuality: { blurScore: NaN, glareRatio: 0, meanLuminance: 1, shadowRatio: 0 },
      },
    ],
    [
      'invalid image luminance',
      {
        ...minimalFacePayload(),
        imageQuality: { blurScore: 0, glareRatio: 0, meanLuminance: '1', shadowRatio: 0 },
      },
    ],
    [
      'invalid image glare ratio',
      {
        ...minimalFacePayload(),
        imageQuality: { blurScore: 0, glareRatio: Infinity, meanLuminance: 1, shadowRatio: 0 },
      },
    ],
    [
      'invalid image shadow ratio',
      {
        ...minimalFacePayload(),
        imageQuality: { blurScore: 0, glareRatio: 0, meanLuminance: 1, shadowRatio: null },
      },
    ],
    ['missing stickers', { ...minimalFacePayload(), stickers: undefined }],
    ['wrong stickers type', { ...minimalFacePayload(), stickers: {} }],
    ['wrong tile detections type', { ...minimalFacePayload(), tileDetections: {} }],
    ['wrong quality warnings type', { ...minimalFacePayload(), qualityWarnings: 'warning' }],
    ['non-string quality warning', { ...minimalFacePayload(), qualityWarnings: [1] }],
    ['wrong warnings type', { ...minimalFacePayload(), warnings: null }],
    ['non-string warning', { ...minimalFacePayload(), warnings: ['ok', 1] }],
  ])('rejects %s with the public validation error', (_label, payload) => {
    expectInvalid(parseAnalyzeScanFaceResponse, payload, 'scan analysis')
  })

  it.each([
    ['success status with ok false', { ...minimalFacePayload(), ok: false }],
    ['failure status with ok true', { ...minimalFacePayload(), status: 'low_confidence' }],
    ['unknown status', { ...minimalFacePayload(), status: 'new_status' }],
  ])('rejects the semantic contradiction: %s', (_label, payload) => {
    expectInvalid(parseAnalyzeScanFaceResponse, payload, 'scan analysis')
  })

  it.each([
    ['NaN', Number.NaN],
    ['positive infinity', Infinity],
    ['negative infinity', -Infinity],
    ['fractional', 0.5],
    ['negative', -1],
    ['above 3x3 bounds', 9],
  ])('rejects a %s sticker index', (_label, index) => {
    const sticker = { ...completeFacePayload().stickers[0], index }

    expectInvalid(
      parseAnalyzeScanFaceResponse,
      { ...minimalFacePayload(), stickers: [sticker] },
      'scan analysis',
    )
  })

  it('uses grid context for 2x2 sticker bounds', () => {
    const sticker = { ...completeFacePayload().stickers[0], index: 4 }

    expectInvalid(
      (value) => parseAnalyzeScanFaceResponse(value, 2),
      { ...minimalFacePayload(), stickers: [sticker] },
      'scan analysis',
    )
    expect(
      parseAnalyzeScanFaceResponse(
        { ...minimalFacePayload(), stickers: [{ ...sticker, index: 3 }] },
        2,
      ),
    ).toMatchObject({ stickers: [{ index: 3 }] })
  })

  it.each([
    ['non-object sticker', null],
    ['invalid index', { ...completeFacePayload().stickers[0], index: '0' }],
    ['invalid symbol', { ...completeFacePayload().stickers[0], symbol: 'X' }],
    ['invalid confidence', { ...completeFacePayload().stickers[0], confidence: Infinity }],
    ['invalid rgb object', { ...completeFacePayload().stickers[0], rgb: [] }],
    ['invalid red channel', { ...completeFacePayload().stickers[0], rgb: { b: 0, g: 0, r: NaN } }],
    [
      'invalid green channel',
      { ...completeFacePayload().stickers[0], rgb: { b: 0, g: '0', r: 0 } },
    ],
    [
      'invalid blue channel',
      { ...completeFacePayload().stickers[0], rgb: { b: null, g: 0, r: 0 } },
    ],
    ['wrong polygon type', { ...completeFacePayload().stickers[0], polygon: {} }],
    ['non-object polygon point', { ...completeFacePayload().stickers[0], polygon: [null] }],
    [
      'invalid polygon x',
      { ...completeFacePayload().stickers[0], polygon: [{ x: Infinity, y: 0 }] },
    ],
    ['invalid polygon y', { ...completeFacePayload().stickers[0], polygon: [{ x: 0, y: '0' }] }],
    ['wrong alternatives type', { ...completeFacePayload().stickers[0], alternatives: null }],
    [
      'invalid alternative symbol',
      { ...completeFacePayload().stickers[0], alternatives: [{ confidence: 1, symbol: 'X' }] },
    ],
    [
      'invalid alternative confidence',
      { ...completeFacePayload().stickers[0], alternatives: [{ confidence: NaN, symbol: 'U' }] },
    ],
    ['wrong probabilities type', { ...completeFacePayload().stickers[0], probabilities: [] }],
    [
      'missing probability symbol',
      { ...completeFacePayload().stickers[0], probabilities: { B: 0, D: 0, F: 0, L: 0, R: 0 } },
    ],
    [
      'non-finite probability',
      {
        ...completeFacePayload().stickers[0],
        probabilities: { B: 0, D: 0, F: 0, L: 0, R: Infinity, U: 1 },
      },
    ],
    ['wrong quality type', { ...completeFacePayload().stickers[0], quality: [] }],
    [
      'invalid color variance',
      {
        ...completeFacePayload().stickers[0],
        quality: { colorVariance: NaN, glareRatio: 0, margin: 1, shadowRatio: 0 },
      },
    ],
    [
      'invalid sticker glare',
      {
        ...completeFacePayload().stickers[0],
        quality: { colorVariance: 0, glareRatio: '0', margin: 1, shadowRatio: 0 },
      },
    ],
    [
      'invalid sticker shadow',
      {
        ...completeFacePayload().stickers[0],
        quality: { colorVariance: 0, glareRatio: 0, margin: 1, shadowRatio: Infinity },
      },
    ],
    [
      'invalid sticker margin',
      {
        ...completeFacePayload().stickers[0],
        quality: { colorVariance: 0, glareRatio: 0, margin: null, shadowRatio: 0 },
      },
    ],
  ])('rejects a sticker with %s', (_label, sticker) => {
    expectInvalid(
      parseAnalyzeScanFaceResponse,
      { ...minimalFacePayload(), stickers: [sticker] },
      'scan analysis',
    )
  })

  it.each([
    ['non-object detection', null],
    ['invalid symbol', { bbox: { height: 1, width: 1, x: 0, y: 0 }, confidence: 1, symbol: 'X' }],
    [
      'invalid confidence',
      { bbox: { height: 1, width: 1, x: 0, y: 0 }, confidence: NaN, symbol: 'face' },
    ],
    ['invalid bbox', { bbox: [], confidence: 1, symbol: 'face' }],
    [
      'invalid bbox x',
      { bbox: { height: 1, width: 1, x: '0', y: 0 }, confidence: 1, symbol: 'face' },
    ],
    [
      'invalid bbox y',
      { bbox: { height: 1, width: 1, x: 0, y: Infinity }, confidence: 1, symbol: 'face' },
    ],
    [
      'invalid bbox width',
      { bbox: { height: 1, width: null, x: 0, y: 0 }, confidence: 1, symbol: 'face' },
    ],
    [
      'invalid bbox height',
      { bbox: { height: NaN, width: 1, x: 0, y: 0 }, confidence: 1, symbol: 'face' },
    ],
  ])('rejects a tile detection with %s', (_label, detection) => {
    expectInvalid(
      parseAnalyzeScanFaceResponse,
      { ...minimalFacePayload(), tileDetections: [detection] },
      'scan analysis',
    )
  })
})

describe('scan session response validation', () => {
  it('accepts a complete payload with nested scan, solve, inference, and diagnostics', () => {
    const payload = completeSessionPayload()

    expect(parseScanSessionResult(payload)).toEqual(payload)
  })

  it('accepts the minimum valid payload', () => {
    expect(parseScanSessionResult(minimalSessionPayload())).toEqual(minimalSessionPayload())
  })

  it('normalizes nullable messages throughout a nested scan payload', () => {
    const payload = {
      ...minimalSessionPayload(),
      message: null,
      scan: {
        faces: [
          {
            analysis: {
              ...minimalFacePayload(),
              detectedCenter: null,
              expectedCenter: null,
              imageSize: null,
              message: null,
            },
            symbol: 'U',
          },
        ],
        message: null,
        ok: true,
        status: 'analyzed',
        warnings: [],
      },
    }

    expect(parseScanSessionResult(payload)).toMatchObject({
      message: undefined,
      scan: {
        faces: [
          {
            analysis: {
              detectedCenter: undefined,
              expectedCenter: undefined,
              imageSize: undefined,
              message: undefined,
            },
          },
        ],
        message: undefined,
      },
    })
  })

  it.each([
    'needs_rescan_face',
    'needs_manual_confirmation',
    'state_ambiguous',
    'orientation_ambiguous',
    'invalid_session',
    'invalid_cube_state',
    'not_found_within_limits',
    'node_limit_exceeded',
    'vision_unavailable',
    'vision_error',
    'api_error',
  ])('accepts the stable %s failure status', (status) => {
    const { solve: _solve, ...session } = minimalSessionPayload()
    const payload = { ...session, ok: false, status }

    expect(parseScanSessionResult(payload)).toMatchObject({ ok: false, status })
  })

  it.each([
    'unknown_puzzle',
    'unsupported_puzzle',
  ])('accepts the stable %s puzzle failure status', (status) => {
    const { solve: _solve, ...session } = minimalSessionPayload()
    const payload = { ...session, ok: false, status }

    expect(parseScanSessionResult(payload)).toMatchObject({ ok: false, status })
  })

  it.each([
    [
      'accepted session without solve success',
      (() => {
        const { solve: _solve, ...payload } = minimalSessionPayload()
        return payload
      })(),
    ],
    [
      'accepted session with failed solve',
      {
        ...minimalSessionPayload(),
        solve: { ...solvePayload(), ok: false, status: 'not_found_within_limits' },
      },
    ],
    [
      'failed session with successful solve',
      { ...minimalSessionPayload(), ok: false, status: 'needs_rescan_face' },
    ],
    [
      'failed session with solve success status',
      {
        ...minimalSessionPayload(),
        ok: false,
        solve: { ...solvePayload(), ok: false },
        status: 'needs_manual_confirmation',
      },
    ],
    ['success flag with failure status', { ...minimalSessionPayload(), status: 'api_error' }],
    [
      'failure flag with success status',
      { ...minimalSessionPayload(), ok: false, status: 'accepted' },
    ],
    ['unknown status', { ...minimalSessionPayload(), status: 'new_status' }],
  ])('rejects the semantic contradiction: %s', (_label, payload) => {
    expectInvalid(parseScanSessionResult, payload, 'scan session')
  })

  it.each([
    ['non-object root', null],
    ['array root', []],
    ['missing ok', { ...minimalSessionPayload(), ok: undefined }],
    ['wrong ok type', { ...minimalSessionPayload(), ok: 1 }],
    ['missing status', { ...minimalSessionPayload(), status: undefined }],
    ['wrong status type', { ...minimalSessionPayload(), status: 1 }],
    ['wrong message type', { ...minimalSessionPayload(), message: [] }],
    ['wrong timings type', { ...minimalSessionPayload(), timings: [] }],
    ['wrong scan type', { ...minimalSessionPayload(), scan: [] }],
    ['wrong solve type', { ...minimalSessionPayload(), solve: [] }],
    ['wrong inference type', { ...minimalSessionPayload(), inference: [] }],
    ['missing rescanFaces', { ...minimalSessionPayload(), rescanFaces: undefined }],
    ['wrong rescanFaces type', { ...minimalSessionPayload(), rescanFaces: 'F' }],
    ['invalid rescan face symbol', { ...minimalSessionPayload(), rescanFaces: ['X'] }],
    ['missing manualTargets', { ...minimalSessionPayload(), manualTargets: undefined }],
    ['wrong manualTargets type', { ...minimalSessionPayload(), manualTargets: {} }],
    ['wrong invalidCorners type', { ...minimalSessionPayload(), invalidCorners: {} }],
  ])('rejects %s with the public validation error', (_label, payload) => {
    expectInvalid(parseScanSessionResult, payload, 'scan session')
  })

  it.each([
    ['invalid total', { totalElapsedMs: NaN }],
    ['invalid vision', { totalElapsedMs: 1, visionElapsedMs: Infinity }],
    ['invalid early gate', { earlyQualityGateElapsedMs: '1', totalElapsedMs: 1 }],
    ['invalid inference', { inferenceElapsedMs: null, totalElapsedMs: 1 }],
    ['invalid quality gate', { qualityGateElapsedMs: {}, totalElapsedMs: 1 }],
    ['invalid solve', { solveElapsedMs: -Infinity, totalElapsedMs: 1 }],
  ])('rejects timings with %s', (_label, timings) => {
    expectInvalid(parseScanSessionResult, { ...minimalSessionPayload(), timings }, 'scan session')
  })

  it.each([
    ['missing faces', { ok: true, status: 'analyzed', warnings: [] }],
    ['wrong faces type', { faces: {}, ok: true, status: 'analyzed', warnings: [] }],
    ['non-object face', { faces: [null], ok: true, status: 'analyzed', warnings: [] }],
    [
      'invalid face symbol',
      {
        faces: [{ analysis: minimalFacePayload(), symbol: 'X' }],
        ok: true,
        status: 'analyzed',
        warnings: [],
      },
    ],
    [
      'invalid expected top',
      {
        faces: [{ analysis: minimalFacePayload(), expectedTop: null, symbol: 'U' }],
        ok: true,
        status: 'analyzed',
        warnings: [],
      },
    ],
    [
      'invalid analysis',
      { faces: [{ analysis: {}, symbol: 'U' }], ok: true, status: 'analyzed', warnings: [] },
    ],
    ['invalid warnings', { faces: [], ok: true, status: 'analyzed', warnings: [1] }],
  ])('rejects a nested scan with %s', (_label, scan) => {
    expectInvalid(parseScanSessionResult, { ...minimalSessionPayload(), scan }, 'scan session')
  })

  it.each([
    ['analyzed status with ok false', { faces: [], ok: false, status: 'analyzed', warnings: [] }],
    [
      'partial failure status with ok true',
      { faces: [], ok: true, status: 'partial_failure', warnings: [] },
    ],
    ['unknown status', { faces: [], ok: true, status: 'new_status', warnings: [] }],
  ])('rejects the nested scan contradiction: %s', (_label, scan) => {
    expectInvalid(parseScanSessionResult, { ...minimalSessionPayload(), scan }, 'scan session')
  })

  it.each([
    ['non-object target', null],
    ['invalid face', { face: 'X', stickers: [0] }],
    ['wrong stickers type', { face: 'U', stickers: {} }],
    ['invalid sticker index', { face: 'U', stickers: [Infinity] }],
  ])('rejects a manual target with %s', (_label, target) => {
    expectInvalid(
      parseScanSessionResult,
      { ...minimalSessionPayload(), manualTargets: [target] },
      'scan session',
    )
  })

  it.each([
    Number.NaN,
    Infinity,
    -Infinity,
    0.5,
    -1,
    9,
  ])('rejects the manual target sticker index %s', (index) => {
    expectInvalid(
      parseScanSessionResult,
      { ...minimalSessionPayload(), manualTargets: [{ face: 'U', stickers: [index] }] },
      'scan session',
    )
  })

  it('uses puzzle context for 2x2 target bounds', () => {
    expectInvalid(
      (value) => parseScanSessionResult(value, 'cube-2x2x2'),
      { ...minimalSessionPayload(), manualTargets: [{ face: 'U', stickers: [4] }] },
      'scan session',
    )
    expect(
      parseScanSessionResult(
        { ...minimalSessionPayload(), manualTargets: [{ face: 'U', stickers: [3] }] },
        'cube-2x2x2',
      ),
    ).toMatchObject({ manualTargets: [{ stickers: [3] }] })
  })

  it.each([
    ['missing status', { manualTargets: [], rescanFaces: [], stateConfidence: 1 }],
    [
      'wrong margin',
      { manualTargets: [], margin: NaN, rescanFaces: [], stateConfidence: 1, status: 'accepted' },
    ],
    [
      'wrong confidence',
      { manualTargets: [], rescanFaces: [], stateConfidence: Infinity, status: 'accepted' },
    ],
    [
      'wrong candidate facelets',
      {
        candidateFacelets: null,
        manualTargets: [],
        rescanFaces: [],
        stateConfidence: 1,
        status: 'accepted',
      },
    ],
    [
      'wrong rescan faces',
      { manualTargets: [], rescanFaces: ['X'], stateConfidence: 1, status: 'accepted' },
    ],
    [
      'wrong manual targets',
      {
        manualTargets: [{ face: 'U', stickers: ['0'] }],
        rescanFaces: [],
        stateConfidence: 1,
        status: 'accepted',
      },
    ],
    [
      'wrong quality reasons',
      {
        manualTargets: [],
        qualityReasons: [1],
        rescanFaces: [],
        stateConfidence: 1,
        status: 'accepted',
      },
    ],
  ])('rejects inference with %s', (_label, inference) => {
    expectInvalid(parseScanSessionResult, { ...minimalSessionPayload(), inference }, 'scan session')
  })

  it.each([
    ['non-object corner', null],
    ['wrong position', { faces: [], position: 1, stickers: [] }],
    ['wrong faces type', { faces: {}, position: 'URF', stickers: [] }],
    ['invalid face symbol', { faces: ['X'], position: 'URF', stickers: [] }],
    ['wrong stickers type', { faces: [], position: 'URF', stickers: {} }],
    ['invalid sticker symbol', { faces: [], position: 'URF', stickers: ['X'] }],
    ['wrong targets type', { faces: [], position: 'URF', stickers: [], targets: {} }],
    ['non-object target', { faces: [], position: 'URF', stickers: [], targets: [null] }],
    [
      'invalid target face',
      { faces: [], position: 'URF', stickers: [], targets: [{ face: 'X', index: 0 }] },
    ],
    [
      'invalid target index',
      { faces: [], position: 'URF', stickers: [], targets: [{ face: 'U', index: NaN }] },
    ],
    ['wrong reason', { faces: [], position: 'URF', reason: null, stickers: [] }],
  ])('rejects an invalid corner with %s', (_label, corner) => {
    expectInvalid(
      parseScanSessionResult,
      { ...minimalSessionPayload(), invalidCorners: [corner] },
      'scan session',
    )
  })

  it.each([
    Infinity,
    -Infinity,
    0.5,
    -1,
    9,
  ])('rejects the invalid-corner target index %s', (index) => {
    expectInvalid(
      parseScanSessionResult,
      {
        ...minimalSessionPayload(),
        invalidCorners: [
          { faces: [], position: 'URF', stickers: [], targets: [{ face: 'U', index }] },
        ],
      },
      'scan session',
    )
  })

  it('rejects an invalid nested solve while accepting a valid one', () => {
    expect(
      parseScanSessionResult({ ...minimalSessionPayload(), solve: solvePayload() }),
    ).toMatchObject({
      solve: { ok: true, status: 'success' },
    })

    expectInvalid(
      parseScanSessionResult,
      { ...minimalSessionPayload(), solve: { ...solvePayload(), moves: [1] } },
      'scan session',
    )
  })
})

describe('generic scan API errors', () => {
  it.each([
    [{ message: 'Invalid image' }, 'Invalid image'],
    [{ message: ['Invalid image', '', 1, 'Try again'] }, 'Invalid image, Try again'],
  ])('returns a useful public message from %j', (payload, message) => {
    expect(genericApiErrorMessage(payload)).toBe(message)
  })

  it.each([
    null,
    [],
    {},
    { message: '' },
    { message: ['', 1] },
    { message: 1 },
    { message: 'domain result', ok: false },
    { message: 'domain result', status: 'vision_error' },
  ])('does not treat %j as a generic API error', (payload) => {
    expect(genericApiErrorMessage(payload)).toBeUndefined()
  })

  it('recognizes every supported face symbol', () => {
    for (const symbol of faceSymbols) {
      expect(
        parseScanSessionResult({
          ...minimalSessionPayload(),
          manualTargets: [{ face: symbol, stickers: [0] }],
          rescanFaces: [symbol],
        }),
      ).toMatchObject({ manualTargets: [{ face: symbol }], rescanFaces: [symbol] })
    }
  })
})
