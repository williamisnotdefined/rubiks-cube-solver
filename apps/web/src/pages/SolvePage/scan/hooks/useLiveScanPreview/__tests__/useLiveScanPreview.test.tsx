import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnalyzeScanFaceResponse } from '@api/scan'
import { captureScanPreviewImage, type CapturedScanImage } from '../../../scanCapture'
import { useLiveScanPreview } from '../useLiveScanPreview'

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

vi.mock('../../../scanCapture', () => ({
  captureScanPreviewImage: vi.fn(),
}))

const captureScanPreviewImageMock = vi.mocked(captureScanPreviewImage)
const previewIntervalMs = 750

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

  it('requests preview frames and auto-fills review after stable sticker tracking', async () => {
    apiMocks.analyzeMutateAsync.mockResolvedValue(stableAnalysis())
    const videoRef = { current: document.createElement('video') }

    const { result } = renderHook(() =>
      useLiveScanPreview({
        enabled: true,
        expectedCenter: 'U',
        videoRef,
      }),
    )

    for (let frame = 0; frame < 6; frame += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(previewIntervalMs)
      })
    }

    expect(result.current.shouldAutoFill).toBe(true)
    expect(result.current.latestCapture?.photoDataUrl).toBe('data:image/jpeg;base64,preview')
    expect(result.current.status).toBe('holding_steady')
    expect(result.current.stableFrameCount).toBe(6)
    expect(result.current.temporalConsensus.status).toBe('ready')
    expect(result.current.temporalConsensus.framesUsed).toBe(6)
    expect(apiMocks.analyzeMutateAsync).toHaveBeenCalledTimes(6)
  })

  it('aborts the in-flight preview analysis when unmounted', async () => {
    let previewSignal: AbortSignal | undefined
    apiMocks.analyzeMutateAsync.mockImplementation(({ signal }: { signal?: AbortSignal }) => {
      previewSignal = signal
      return new Promise<AnalyzeScanFaceResponse>(() => {
        // Keep the request pending until cleanup aborts it.
      })
    })
    const videoRef = { current: document.createElement('video') }

    const { unmount } = renderHook(() =>
      useLiveScanPreview({
        enabled: true,
        expectedCenter: 'U',
        videoRef,
      }),
    )

    await advancePreviewFrames(6)

    expect(previewSignal?.aborted).toBe(false)

    unmount()

    expect(previewSignal?.aborted).toBe(true)
  })

  it('ignores preview responses that resolve after unmount', async () => {
    let resolveAnalysis: ((analysis: AnalyzeScanFaceResponse) => void) | undefined
    apiMocks.analyzeMutateAsync.mockImplementation(
      () => new Promise<AnalyzeScanFaceResponse>((resolve) => {
        resolveAnalysis = resolve
      }),
    )
    const videoRef = { current: document.createElement('video') }
    const { result, unmount } = renderHook(() =>
      useLiveScanPreview({
        enabled: true,
        expectedCenter: 'U',
        videoRef,
      }),
    )

    await advancePreviewFrames(6)

    unmount()
    await act(async () => {
      resolveAnalysis?.(stableAnalysis())
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(result.current.shouldAutoFill).toBe(false)
  })

  it('ignores an in-flight preview response after scanning is disabled', async () => {
    let previewSignal: AbortSignal | undefined
    let resolveAnalysis: ((analysis: AnalyzeScanFaceResponse) => void) | undefined
    apiMocks.analyzeMutateAsync.mockImplementation(
      ({ signal }: { signal?: AbortSignal }) => {
        previewSignal = signal
        return new Promise<AnalyzeScanFaceResponse>((resolve) => {
          resolveAnalysis = resolve
        })
      },
    )
    const videoRef = { current: document.createElement('video') }
    const { result, rerender } = renderHook(
      ({ enabled }) =>
        useLiveScanPreview({
          enabled,
          expectedCenter: 'U',
          videoRef,
        }),
      { initialProps: { enabled: true } },
    )

    await advancePreviewFrames(1)
    expect(apiMocks.analyzeMutateAsync).toHaveBeenCalledOnce()

    rerender({ enabled: false })
    expect(previewSignal?.aborted).toBe(true)

    await act(async () => {
      resolveAnalysis?.(stableAnalysis())
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(result.current.status).toBe('idle')
    expect(result.current.latestAnalysis).toBeUndefined()
    expect(result.current.latestCapture).toBeUndefined()
    expect(result.current.shouldAutoFill).toBe(false)
  })

  it('does not auto-fill center mismatches', async () => {
    apiMocks.analyzeMutateAsync.mockResolvedValue(stableAnalysis({ centerMismatch: true }))
    const videoRef = { current: document.createElement('video') }

    const { result } = renderHook(() =>
      useLiveScanPreview({
        enabled: true,
        expectedCenter: 'U',
        videoRef,
      }),
    )

    for (let frame = 0; frame < 5; frame += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(previewIntervalMs)
      })
    }

    expect(result.current.shouldAutoFill).toBe(false)
    expect(result.current.message).toBe('Detected another center color. Rotate to the expected face.')
  })

  it('does not track or auto-fill unsupported analysis modes', async () => {
    apiMocks.analyzeMutateAsync.mockResolvedValue(
      stableAnalysis({ detectionMode: 'legacy_geometry', faceConfidence: 0.9 }),
    )
    const videoRef = { current: document.createElement('video') }

    const { result } = renderHook(() =>
      useLiveScanPreview({
        enabled: true,
        expectedCenter: 'U',
        videoRef,
      }),
    )

    for (let frame = 0; frame < 8; frame += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(previewIntervalMs)
      })
    }

    expect(result.current.shouldAutoFill).toBe(false)
    expect(result.current.status).toBe('searching')
    expect(result.current.stableFrameCount).toBe(0)
    expect(result.current.message).toBe('Looking for cube face.')
  })

  it('reports partial tile detector progress before tracking', async () => {
    apiMocks.analyzeMutateAsync.mockResolvedValue(
      stableAnalysis({ tileDetections: stableTileDetections().slice(0, 3) }),
    )
    const videoRef = { current: document.createElement('video') }

    const { result } = renderHook(() =>
      useLiveScanPreview({
        enabled: true,
        expectedCenter: 'U',
        videoRef,
      }),
    )

    await advancePreviewFrames(1)

    expect(result.current.shouldAutoFill).toBe(false)
    expect(result.current.status).toBe('detecting_stickers')
    expect(result.current.message).toBe('Detecting stickers: 3/9 found.')
  })

  it('shows quality warnings before tracking messages', async () => {
    apiMocks.analyzeMutateAsync.mockResolvedValue(
      stableAnalysis({ qualityWarnings: ['image_blurry'] }),
    )
    const videoRef = { current: document.createElement('video') }

    const { result } = renderHook(() =>
      useLiveScanPreview({
        enabled: true,
        expectedCenter: 'U',
        videoRef,
      }),
    )

    await advancePreviewFrames(1)

    expect(result.current.shouldAutoFill).toBe(false)
    expect(result.current.status).toBe('tracking')
    expect(result.current.message).toBe('Image is blurry. Hold the cube steady.')
  })

  it('does not auto-fill non-tile analysis', async () => {
    apiMocks.analyzeMutateAsync.mockResolvedValue(stableAnalysis({ detectionMode: 'legacy_mode' }))
    const videoRef = { current: document.createElement('video') }

    const { result } = renderHook(() =>
      useLiveScanPreview({
        enabled: true,
        expectedCenter: 'U',
        videoRef,
      }),
    )

    for (let frame = 0; frame < 8; frame += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(previewIntervalMs)
      })
    }

    expect(result.current.shouldAutoFill).toBe(false)
    expect(result.current.stableFrameCount).toBe(0)
  })

  it('stays idle and resets auto-fill when disabled', () => {
    const videoRef = { current: document.createElement('video') }

    const { result } = renderHook(() =>
      useLiveScanPreview({
        enabled: false,
        expectedCenter: 'U',
        videoRef,
      }),
    )

    expect(result.current.status).toBe('idle')
    expect(result.current.shouldAutoFill).toBe(false)
    expect(captureScanPreviewImageMock).not.toHaveBeenCalled()
  })

  it('waits when the document is hidden', async () => {
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    const videoRef = { current: document.createElement('video') }

    const { result } = renderHook(() =>
      useLiveScanPreview({
        enabled: true,
        expectedCenter: 'U',
        videoRef,
      }),
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(previewIntervalMs)
    })

    expect(result.current.status).toBe('searching')
    expect(captureScanPreviewImageMock).not.toHaveBeenCalled()
    expect(apiMocks.analyzeMutateAsync).not.toHaveBeenCalled()
  })

  it('waits when no video or no preview capture is available', async () => {
    const { result, rerender } = renderHook(
      ({ current }: { current: HTMLVideoElement | null }) =>
        useLiveScanPreview({
          enabled: true,
          expectedCenter: 'U',
          videoRef: { current },
        }),
      { initialProps: { current: null as HTMLVideoElement | null } },
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(previewIntervalMs)
    })
    expect(result.current.status).toBe('searching')

    captureScanPreviewImageMock.mockReturnValue(undefined)
    rerender({ current: document.createElement('video') })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(previewIntervalMs)
    })

    expect(result.current.status).toBe('searching')
    expect(apiMocks.analyzeMutateAsync).not.toHaveBeenCalled()
  })

  it('allows auto-fill acknowledgement and reset', async () => {
    apiMocks.analyzeMutateAsync.mockResolvedValue(stableAnalysis())
    const videoRef = { current: document.createElement('video') }
    const { result } = renderHook(() =>
      useLiveScanPreview({
        enabled: true,
        expectedCenter: 'U',
        videoRef,
      }),
    )

    for (let frame = 0; frame < 6; frame += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(previewIntervalMs)
      })
    }
    expect(result.current.shouldAutoFill).toBe(true)

    act(() => result.current.acknowledgeAutoFill())
    expect(result.current.shouldAutoFill).toBe(false)

    act(() => result.current.resetAutoFill())
    expect(result.current.shouldAutoFill).toBe(false)
  })

  it('handles preview analysis errors without auto-fill', async () => {
    apiMocks.analyzeMutateAsync.mockImplementation(() => {
      throw new Error('preview failed')
    })
    const videoRef = { current: document.createElement('video') }
    const { result } = renderHook(() =>
      useLiveScanPreview({
        enabled: true,
        expectedCenter: 'U',
        videoRef,
      }),
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(previewIntervalMs)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(apiMocks.analyzeMutateAsync).toHaveBeenCalled()
    expect(result.current.shouldAutoFill).toBe(false)
    expect(result.current.status).toBe('error')
  })

  it('uses a fallback message for non-error preview analysis failures', async () => {
    apiMocks.analyzeMutateAsync.mockRejectedValue('preview failed')
    const videoRef = { current: document.createElement('video') }
    const { result } = renderHook(() =>
      useLiveScanPreview({
        enabled: true,
        expectedCenter: 'U',
        videoRef,
      }),
    )

    await advancePreviewFrames(1)

    expect(apiMocks.analyzeMutateAsync).toHaveBeenCalled()
    expect(result.current.shouldAutoFill).toBe(false)
  })

  it('ignores abort errors from preview analysis', async () => {
    apiMocks.analyzeMutateAsync.mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }))
    const videoRef = { current: document.createElement('video') }
    const { result } = renderHook(() =>
      useLiveScanPreview({
        enabled: true,
        expectedCenter: 'U',
        videoRef,
      }),
    )

    await advancePreviewFrames(1)

    expect(apiMocks.analyzeMutateAsync).toHaveBeenCalled()
    expect(result.current.status).toBe('searching')
  })

})

async function advancePreviewFrames(count: number) {
  for (let frame = 0; frame < count; frame += 1) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(previewIntervalMs)
    })
  }
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0)
  })
}

function stableAnalysis({
  centerMismatch = false,
  detectionMode = 'tile_detector',
  faceConfidence = 0.9,
  qualityWarnings = [],
  tileDetections,
  warnings = [],
}: {
  centerMismatch?: boolean
  detectionMode?: AnalyzeScanFaceResponse['detectionMode']
  faceConfidence?: number
  qualityWarnings?: string[]
  tileDetections?: NonNullable<AnalyzeScanFaceResponse['tileDetections']>
  warnings?: string[]
} = {}): AnalyzeScanFaceResponse {
  const effectiveTileDetections = tileDetections ?? (detectionMode === 'tile_detector' ? stableTileDetections() : [])

  return {
    centerMismatch,
    confidence: 1,
    detectedCenter: centerMismatch ? 'F' : 'U',
    detectedCenterConfidence: 1,
    detectionMode,
    expectedCenter: 'U',
    faceConfidence,
    imageSize: { width: 480, height: 480 },
    ok: !centerMismatch,
    qualityWarnings,
    status: centerMismatch ? 'center_mismatch' : 'detected',
    stickers: Array.from({ length: 9 }, (_, index) => ({
      alternatives: [],
      confidence: 0.92,
      index,
      polygon: [],
      rgb: { b: 40, g: 160, r: 40 },
      symbol: index === 4 ? 'U' : 'F',
    })),
    tileDetections: effectiveTileDetections,
    warnings,
  }
}

function stableTileDetections(): NonNullable<AnalyzeScanFaceResponse['tileDetections']> {
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
      confidence: 0.9,
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
