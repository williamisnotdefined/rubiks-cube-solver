import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnalyzeScanFaceResponse } from '@api/scan'
import { captureScanPreviewImage, type CapturedScanImage } from '../../scanCapture'
import { averageQuadMovement, useLiveScanPreview } from '../useLiveScanPreview'

const apiMocks = vi.hoisted(() => ({
  analyzeMutateAsync: vi.fn(),
}))

vi.mock('@api/scan', async () => {
  const actual = await vi.importActual<typeof import('@api/scan')>('@api/scan')

  return {
    ...actual,
    useAnalyzeScanFace: () => ({
      mutateAsync: apiMocks.analyzeMutateAsync,
    }),
  }
})

vi.mock('../../scanCapture', () => ({
  captureScanPreviewImage: vi.fn(),
}))

const captureScanPreviewImageMock = vi.mocked(captureScanPreviewImage)

describe('useLiveScanPreview', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    apiMocks.analyzeMutateAsync.mockReset()
    captureScanPreviewImageMock.mockReset()
    captureScanPreviewImageMock.mockReturnValue(capturedPreviewImage())
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('requests preview frames and auto-captures after stable tracking', async () => {
    apiMocks.analyzeMutateAsync.mockResolvedValue(stableAnalysis())
    const videoRef = { current: document.createElement('video') }
    const knownCenters = {}

    const { result } = renderHook(() =>
      useLiveScanPreview({
        enabled: true,
        expectedCenter: 'U',
        knownCenters,
        videoRef,
      }),
    )

    for (let frame = 0; frame < 6; frame += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(320)
      })
    }

    expect(result.current.shouldAutoCapture).toBe(true)
    expect(result.current.status).toBe('holding_steady')
    expect(result.current.stableFrameCount).toBe(6)
    expect(result.current.temporalConsensus.status).toBe('ready')
    expect(result.current.temporalConsensus.framesUsed).toBe(6)
    expect(apiMocks.analyzeMutateAsync).toHaveBeenCalledTimes(6)
  })

  it('does not auto-capture center mismatches', async () => {
    apiMocks.analyzeMutateAsync.mockResolvedValue(stableAnalysis({ centerMismatch: true }))
    const videoRef = { current: document.createElement('video') }
    const knownCenters = {}

    const { result } = renderHook(() =>
      useLiveScanPreview({
        enabled: true,
        expectedCenter: 'U',
        knownCenters,
        videoRef,
      }),
    )

    for (let frame = 0; frame < 5; frame += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(320)
      })
    }

    expect(result.current.shouldAutoCapture).toBe(false)
    expect(result.current.message).toBe('Detected another center color. Rotate to the expected face.')
  })

  it('does not track or auto-capture guide fallback analysis', async () => {
    apiMocks.analyzeMutateAsync.mockResolvedValue(
      stableAnalysis({ detectionMode: 'guide_fallback', faceConfidence: 0.9 }),
    )
    const videoRef = { current: document.createElement('video') }
    const knownCenters = {}

    const { result } = renderHook(() =>
      useLiveScanPreview({
        enabled: true,
        expectedCenter: 'U',
        knownCenters,
        videoRef,
      }),
    )

    for (let frame = 0; frame < 8; frame += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(320)
      })
    }

    expect(result.current.shouldAutoCapture).toBe(false)
    expect(result.current.status).toBe('searching')
    expect(result.current.stableFrameCount).toBe(0)
    expect(result.current.message).toBe('Looking for cube face. Keep the cube fully visible.')
  })

  it('does not auto-capture contour-only analysis', async () => {
    apiMocks.analyzeMutateAsync.mockResolvedValue(stableAnalysis({ detectionMode: 'contour' }))
    const videoRef = { current: document.createElement('video') }

    const { result } = renderHook(() =>
      useLiveScanPreview({
        enabled: true,
        expectedCenter: 'U',
        knownCenters: {},
        videoRef,
      }),
    )

    for (let frame = 0; frame < 8; frame += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(320)
      })
    }

    expect(result.current.shouldAutoCapture).toBe(false)
    expect(result.current.stableFrameCount).toBe(0)
  })

  it('measures normalized quad movement', () => {
    expect(
      averageQuadMovement(
        [
          { x: 0.1, y: 0.1 },
          { x: 0.9, y: 0.1 },
          { x: 0.9, y: 0.9 },
          { x: 0.1, y: 0.9 },
        ],
        [
          { x: 0.11, y: 0.1 },
          { x: 0.91, y: 0.1 },
          { x: 0.91, y: 0.9 },
          { x: 0.11, y: 0.9 },
        ],
      ),
    ).toBeCloseTo(0.01)
  })
})

function stableAnalysis({
  centerMismatch = false,
  detectionMode = 'tile_detector',
  faceConfidence = 0.9,
} = {}): AnalyzeScanFaceResponse {
  const gridDetections = detectionMode === 'tile_detector' ? stableGridDetections() : []

  return {
    centerMismatch,
    confidence: 1,
    detectedCenter: centerMismatch ? 'F' : 'U',
    detectedCenterConfidence: 1,
    detectionMode,
    expectedCenter: 'U',
    faceConfidence,
    faceQuad: [
      { x: 0.1, y: 0.1 },
      { x: 0.9, y: 0.1 },
      { x: 0.9, y: 0.9 },
      { x: 0.1, y: 0.9 },
    ],
    gridConfidence: detectionMode === 'tile_detector' ? 0.8 : 0,
    gridDetections,
    gridStatus: detectionMode === 'tile_detector' ? 'ready' : 'not_found',
    imageSize: { width: 480, height: 480 },
    ok: !centerMismatch,
    qualityWarnings: [],
    status: centerMismatch ? 'center_mismatch' : 'detected',
    stickers: Array.from({ length: 9 }, (_, index) => ({
      alternatives: [],
      confidence: 0.92,
      index,
      polygon: [],
      rgb: { b: 40, g: 160, r: 40 },
      symbol: index === 4 ? 'U' : 'F',
    })),
    tileDetections: gridDetections.map((detection) => ({
      bbox: detection.bbox!,
      confidence: detection.confidence,
      symbol: detection.symbol!,
    })),
    warnings: [],
  }
}

function stableGridDetections(): NonNullable<AnalyzeScanFaceResponse['gridDetections']> {
  return Array.from({ length: 9 }, (_, index) => {
    const row = Math.floor(index / 3)
    const column = index % 3

    return {
      bbox: {
        height: 0.18,
        width: 0.18,
        x: 0.25 + column * 0.25,
        y: 0.25 + row * 0.25,
      },
      column,
      confidence: 0.9,
      index,
      row,
      symbol: index === 4 ? 'U' : 'F',
    }
  })
}

function capturedPreviewImage(): CapturedScanImage {
  return {
    capturedAt: 123,
    height: 480,
    photoDataUrl: 'data:image/jpeg;base64,preview',
    source: 'canvas',
    width: 480,
  }
}
