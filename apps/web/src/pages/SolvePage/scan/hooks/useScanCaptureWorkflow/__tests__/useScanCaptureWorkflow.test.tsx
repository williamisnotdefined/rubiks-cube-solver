import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@src/i18n/i18n'
import { useScanCaptureWorkflow } from '../useScanCaptureWorkflow'

const workflowMocks = vi.hoisted(() => ({
  analyzeScanFace: {
    reset: vi.fn(),
    mutateAsync: vi.fn(),
  },
  cameraState: { status: 'error', message: 'camera unavailable' },
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

describe('useScanCaptureWorkflow', () => {
  beforeEach(() => {
    workflowMocks.analyzeScanFace.reset.mockClear()
    workflowMocks.analyzeScanFace.mutateAsync.mockReset()
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
})

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
