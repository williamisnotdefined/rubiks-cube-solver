import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@src/i18n/i18n'
import type { AnalyzeScanFaceResponse } from '@api/scan'
import { useScanCaptureWorkflow } from '../useScanCaptureWorkflow'
import { captureScanImage } from '../../../scanCapture'

const workflowMocks = vi.hoisted(() => ({
  analyzeScanFace: {
    reset: vi.fn(),
    mutateAsync: vi.fn(),
  },
  cameraState: { status: 'error', message: 'camera unavailable' } as
    | { status: 'error'; message: string }
    | { status: 'ready'; stream: MediaStream },
  liveScan: {
    acknowledgeAutoFill: vi.fn(),
    latestAnalysis: undefined,
    latestCapture: undefined,
    message: 'Live scan is waiting',
    resetAutoFill: vi.fn(),
    shouldAutoFill: false,
    stableFrameCount: 0,
    status: 'idle',
    temporalConsensus: {
      bboxStability: 0,
      faceConfidence: 0,
      framesRejected: 0,
      framesSeen: 0,
      framesUsed: 0,
      rejectReasons: [],
      status: 'empty',
      stickers: [],
      temporalAgreement: 0,
      tileConfidence: 0,
    },
  },
}))

vi.mock('@api/scan', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@api/scan')>()

  return {
    ...actual,
    useAnalyzeScanFace: () => workflowMocks.analyzeScanFace,
  }
})

vi.mock('../../useCameraStream', () => ({
  useCameraStream: () => workflowMocks.cameraState,
}))

vi.mock('../../useLiveScanPreview', () => ({
  useLiveScanPreview: () => workflowMocks.liveScan,
}))

vi.mock('../../../scanCapture', () => ({
  captureScanImage: vi.fn(),
}))

const captureScanImageMock = vi.mocked(captureScanImage)

describe('useScanCaptureWorkflow', () => {
  beforeEach(() => {
    workflowMocks.analyzeScanFace.reset.mockClear()
    workflowMocks.analyzeScanFace.mutateAsync.mockReset()
    workflowMocks.cameraState = { status: 'error', message: 'camera unavailable' }
    captureScanImageMock.mockReset()
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
    })
    workflowMocks.liveScan.acknowledgeAutoFill.mockClear()
    workflowMocks.liveScan.resetAutoFill.mockClear()
  })

  it('edits stickers while keeping the center fixed', () => {
    const onDraftEdited = vi.fn()
    const { result } = renderWorkflow({ onDraftEdited })

    act(() => result.current.handleStickerColorChange(0, 'R'))
    act(() => result.current.handleStickerColorChange(4, 'R'))

    expect(result.current.stickers[0]).toMatchObject({ source: 'manual', symbol: 'R' })
    expect(result.current.stickers[4]).toMatchObject({
      source: 'center',
      symbol: result.current.currentFace.symbol,
    })
    expect(onDraftEdited).toHaveBeenCalledWith(result.current.currentFace.symbol, 0)
    expect(onDraftEdited).toHaveBeenCalledWith(result.current.currentFace.symbol, 4)
  })

  it('resets scan analysis when changing faces', () => {
    const onFaceChanged = vi.fn()
    const { result } = renderWorkflow({ onFaceChanged })

    act(() => result.current.handleFaceIndexChange(1))

    expect(result.current.currentFace.symbol).toBe('R')
    expect(onFaceChanged).toHaveBeenCalledTimes(1)
    expect(workflowMocks.liveScan.resetAutoFill).toHaveBeenCalledTimes(1)
    expect(workflowMocks.analyzeScanFace.reset).toHaveBeenCalledTimes(1)
  })

  it('clears the current draft and notifies owners', () => {
    const onDraftCleared = vi.fn()
    const onFaceCleared = vi.fn()
    const { result } = renderWorkflow({ onDraftCleared, onFaceCleared })
    const currentFace = result.current.currentFace.symbol

    act(() => result.current.handleStickerColorChange(0, 'R'))
    expect(result.current.canClearPhoto).toBe(true)

    act(() => result.current.handleClearPhoto())

    expect(result.current.canClearPhoto).toBe(false)
    expect(result.current.stickers[0]).toMatchObject({ source: 'empty' })
    expect(result.current.stickers[0]).not.toHaveProperty('symbol')
    expect(onDraftCleared).toHaveBeenCalledTimes(1)
    expect(onFaceCleared).toHaveBeenCalledWith(currentFace)
  })

  it('reports camera-not-ready when taking a photo without a ready stream', async () => {
    const { result } = renderWorkflow()

    await act(async () => result.current.handleTakePhoto())

    expect(result.current.message).toBe(i18n.t('scan.messages.cameraNotReady'))
    expect(workflowMocks.analyzeScanFace.mutateAsync).not.toHaveBeenCalled()
  })

  it('aborts and ignores manual analysis after navigating to another face', async () => {
    let resolveAnalysis: (analysis: AnalyzeScanFaceResponse) => void = () => undefined
    workflowMocks.cameraState = { status: 'ready', stream: {} as MediaStream }
    captureScanImageMock.mockResolvedValue({
      capturedAt: 1,
      height: 480,
      photoDataUrl: 'data:image/jpeg;base64,capture',
      source: 'canvas',
      width: 480,
    })
    workflowMocks.analyzeScanFace.mutateAsync.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAnalysis = resolve
        }),
    )
    const { result } = renderWorkflow()
    act(() => {
      result.current.videoRef.current = document.createElement('video')
    })

    let capturePromise: Promise<void>
    act(() => {
      capturePromise = result.current.handleTakePhoto()
    })
    await vi.waitFor(() =>
      expect(workflowMocks.analyzeScanFace.mutateAsync).toHaveBeenCalledTimes(1),
    )
    const signal = workflowMocks.analyzeScanFace.mutateAsync.mock.calls[0][0].signal as AbortSignal

    act(() => result.current.handleFaceIndexChange(1))
    expect(signal.aborted).toBe(true)
    resolveAnalysis(successfulAnalysis)
    await act(async () => capturePromise!)

    expect(result.current.currentFace.symbol).toBe('R')
    expect(result.current.drafts.F.photoDataUrl).toBeUndefined()
  })
})

const successfulAnalysis: AnalyzeScanFaceResponse = {
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

function renderWorkflow(options: Partial<Parameters<typeof useScanCaptureWorkflow>[0]> = {}) {
  return renderHook(() =>
    useScanCaptureWorkflow({
      centerIndex: 4,
      gridSize: 3,
      stickersPerFace: 9,
      ...options,
    }),
  )
}
