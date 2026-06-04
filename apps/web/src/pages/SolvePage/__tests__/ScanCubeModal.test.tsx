import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnalyzeScanFaceResponse, ScanSessionResult } from '@api/scan'
import type { ScanFaceSymbol, SolveResult } from '@api/solver/types'
import { ScanCubeModal } from '../ScanCubeModal'
import { captureScanImage } from '../scanCapture'
import { scanFaceOrder } from '../scanState'

const apiMocks = vi.hoisted(() => ({
  analyzeReset: vi.fn(),
  analyzeMutateAsync: vi.fn(),
  cameraState: undefined as unknown as
    | { status: 'ready'; stream: MediaStream }
    | { status: 'loading' }
    | { message: string; status: 'error' },
  cameraStream: {} as MediaStream,
  solveSessionIsPending: false,
  solveSessionMutateAsync: vi.fn(),
}))

const liveScanMocks = vi.hoisted(() => ({
  acknowledgeAutoFill: vi.fn(),
  autoFillAcknowledged: false,
  autoRecognize: false,
  analysisOverrides: undefined as
    | {
        centerMismatch?: boolean
        detectedCenter?: ScanFaceSymbol
        detectionMode?: AnalyzeScanFaceResponse['detectionMode']
        stickerSymbol?: ScanFaceSymbol
        tileConfidence?: number
        tileSymbols?: string
      }
    | undefined,
  enabledValues: [] as boolean[],
  resetAutoFill: vi.fn(),
}))

vi.mock('@api/scan', async () => {
  const actual = await vi.importActual<typeof import('@api/scan')>('@api/scan')

  return {
    ...actual,
    useAnalyzeScanFace: () => ({
      mutateAsync: apiMocks.analyzeMutateAsync,
      reset: apiMocks.analyzeReset,
    }),
    useSolveScanSession: () => ({
      isPending: apiMocks.solveSessionIsPending,
      mutateAsync: apiMocks.solveSessionMutateAsync,
    }),
  }
})

vi.mock('../scanCapture', () => ({
  captureScanImage: vi.fn(),
}))

const captureScanImageMock = vi.mocked(captureScanImage)

vi.mock('../hooks/useCameraStream', () => ({
  useCameraStream: () => apiMocks.cameraState,
}))

vi.mock('../hooks/useLiveScanPreview', () => {
  function buildCapturedScanImage() {
    return {
      capturedAt: 123,
      height: 1280,
      photoDataUrl: 'data:image/jpeg;base64,scan',
      source: 'canvas' as const,
      width: 1280,
    }
  }

  function buildScanAnalysisResponse({
    centerMismatch = false,
    detectedCenter,
    detectionMode = 'tile_detector',
    stickerSymbol,
    tileConfidence = 0.9,
    symbol,
    tileSymbols,
  }: {
    centerMismatch?: boolean
    detectedCenter?: ScanFaceSymbol
    detectionMode?: AnalyzeScanFaceResponse['detectionMode']
    stickerSymbol?: ScanFaceSymbol
    tileConfidence?: number
    symbol: ScanFaceSymbol
    tileSymbols?: string
  }): AnalyzeScanFaceResponse {
    const effectiveTileSymbols = tileSymbols ?? symbol.repeat(9)
    const effectiveDetectedCenter = detectedCenter ?? (centerMismatch ? 'U' : symbol)
    const effectiveCenterMismatch = centerMismatch || effectiveDetectedCenter !== symbol
    const tileDetections = [...effectiveTileSymbols].map((tileSymbol, index) => ({
      bbox: { height: 0.18, width: 0.18, x: 0.2 + (index % 3) * 0.25, y: 0.2 + Math.floor(index / 3) * 0.25 },
      confidence: tileConfidence,
      symbol: tileSymbol as ScanFaceSymbol,
    }))

    return {
      centerMismatch: effectiveCenterMismatch,
      confidence: effectiveCenterMismatch ? 0.8 : 1,
      detectedCenterConfidence: effectiveCenterMismatch ? 0.8 : 1,
      detectedCenter: effectiveDetectedCenter,
      detectionMode,
      expectedCenter: symbol,
      faceConfidence: 1,
      imageSize: { width: 640, height: 640 },
      message: effectiveCenterMismatch ? 'Captured center does not match the expected face.' : undefined,
      ok: !effectiveCenterMismatch,
      status: effectiveCenterMismatch ? 'center_mismatch' : 'detected',
      qualityWarnings: [],
      stickers: Array.from({ length: 9 }, (_, index) => ({
        alternatives: [],
        confidence: tileConfidence,
        index,
        polygon: [],
        rgb: { r: 205, g: 210, b: 218 },
        symbol: stickerSymbol ?? symbol,
      })),
      tileDetections,
      warnings: [],
    }
  }

  function buildEmptyLiveScanState() {
      return {
      acknowledgeAutoFill: () => {
        liveScanMocks.autoFillAcknowledged = true
        liveScanMocks.acknowledgeAutoFill()
      },
      latestAnalysis: undefined,
      latestCapture: undefined,
      message: 'Looking for cube face.',
      resetAutoFill: () => {
        liveScanMocks.autoFillAcknowledged = false
        liveScanMocks.resetAutoFill()
      },
      shouldAutoFill: false,
      stableFrameCount: 0,
      status: 'searching',
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
    }
  }

  return {
    useLiveScanPreview: ({ enabled, expectedCenter }: { enabled: boolean; expectedCenter: ScanFaceSymbol }) => {
      liveScanMocks.enabledValues.push(enabled)

      if (!enabled || !liveScanMocks.autoRecognize) {
        return buildEmptyLiveScanState()
      }

      const analysis = buildScanAnalysisResponse({
        ...liveScanMocks.analysisOverrides,
        symbol: expectedCenter,
      })
      const stickers = analysis.tileDetections?.map((detection, index) => ({
        agreement: 1,
        alternatives: [],
      confidence: detection.confidence,
        framesUsed: 6,
        index,
        margin: 1,
        symbol: detection.symbol,
      })) ?? []
      const canAutoFill = analysis.detectionMode === 'tile_detector' && !analysis.centerMismatch && stickers.length === 9

      return {
        acknowledgeAutoFill: () => {
          liveScanMocks.autoFillAcknowledged = true
          liveScanMocks.acknowledgeAutoFill()
        },
        latestAnalysis: analysis,
        latestCapture: buildCapturedScanImage(),
        message: canAutoFill
          ? '9 stickers recognized. Review the colors, correct any square if needed, then confirm this face.'
          : analysis.centerMismatch
            ? 'Detected another center color. Rotate to the expected face.'
            : 'Looking for cube face.',
        resetAutoFill: () => {
          liveScanMocks.autoFillAcknowledged = false
          liveScanMocks.resetAutoFill()
        },
        shouldAutoFill: canAutoFill && !liveScanMocks.autoFillAcknowledged,
        stableFrameCount: 6,
        status: canAutoFill ? 'holding_steady' : 'searching',
        temporalConsensus: {
          bboxStability: 0.92,
          faceConfidence: analysis.faceConfidence,
          framesRejected: 0,
          framesSeen: 6,
          framesUsed: 6,
          rejectReasons: [],
          status: canAutoFill ? 'ready' : analysis.centerMismatch ? 'center_mismatch' : 'collecting',
          stickers,
          temporalAgreement: 1,
          tileConfidence: 0.9,
        },
      }
    },
  }
})

describe('ScanCubeModal', () => {
  beforeEach(() => {
    apiMocks.analyzeMutateAsync.mockReset()
    apiMocks.analyzeReset.mockReset()
    apiMocks.solveSessionMutateAsync.mockReset()
    apiMocks.solveSessionMutateAsync.mockResolvedValue(scanSessionAccepted())
    apiMocks.solveSessionIsPending = false
    apiMocks.cameraState = { status: 'ready', stream: apiMocks.cameraStream }
    captureScanImageMock.mockReset()
    captureScanImageMock.mockResolvedValue(capturedScanImage())
    liveScanMocks.acknowledgeAutoFill.mockClear()
    liveScanMocks.autoFillAcknowledged = false
    liveScanMocks.autoRecognize = false
    liveScanMocks.analysisOverrides = undefined
    liveScanMocks.enabledValues = []
    liveScanMocks.resetAutoFill.mockClear()
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
    })
    Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
      configurable: true,
      value: vi.fn(),
    })
  })

  it('shows a loader in the solve button while solving the scan', () => {
    render(
      <ScanCubeModal
        apiReady
        solving
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Loading' })).toBeDisabled()
    expect(screen.queryByText('Solving scan')).not.toBeInTheDocument()
  })

  it('hides center metadata but shows top orientation for 2x2 scans', () => {
    const { rerender } = render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText(/Expected center:/i)).toBeInTheDocument()
    expect(screen.getByText(/Keep at top:/i)).toBeInTheDocument()

    rerender(
      <ScanCubeModal
        apiReady
        puzzleSlug="cube-2x2x2"
        solving={false}
        onClose={vi.fn()}
      />,
    )

    expect(screen.queryByText(/Expected center:/i)).not.toBeInTheDocument()
    expect(screen.getByText(/Keep at top:/i)).toBeInTheDocument()
  })

  it('closes from Escape and the backdrop', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { rerender } = render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={onClose}
      />,
    )

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)

    await user.keyboard('{Enter}')
    expect(onClose).toHaveBeenCalledTimes(1)

    rerender(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={onClose}
      />,
    )

    await user.click(screen.getByLabelText('Dismiss scan cube'))
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('asks for confirmation before the backdrop closes a scan with progress', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={onClose}
      />,
    )

    await user.click(screen.getByTestId('scan-sticker-0'))
    await user.click(screen.getByRole('button', { name: 'Red' }))
    await user.click(screen.getByLabelText('Dismiss scan cube'))

    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Leave scan?' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog', { name: 'Leave scan?' })).not.toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()

    await user.click(screen.getByLabelText('Dismiss scan cube'))
    await user.click(screen.getByRole('button', { name: 'Leave' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('asks for confirmation before Escape closes a scan with progress', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={onClose}
      />,
    )

    await user.click(screen.getByTestId('scan-sticker-0'))
    await user.click(screen.getByRole('button', { name: 'Red' }))
    await user.keyboard('{Escape}')

    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Leave scan?' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Leave' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('asks for confirmation before the backdrop closes a 2x2 scan with progress', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <ScanCubeModal
        apiReady
        puzzleSlug="cube-2x2x2"
        solving={false}
        onClose={onClose}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Red' }))
    await user.click(screen.getByLabelText('Dismiss scan cube'))

    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Leave scan?' })).toBeInTheDocument()
  })

  it('explains API readiness and solve-disabled reasons before submitting', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <ScanCubeModal
        apiReady={false}
        solving={false}
        onClose={vi.fn()}
      />,
    )

    let solveButton = screen.getByRole('button', { name: 'Solve scanned cube' })
    expect(solveButton).toBeDisabled()

    await user.hover(solveButton.parentElement!)
    expect(await screen.findByRole('tooltip')).toHaveTextContent('The API is not ready yet.')

    rerender(
      <ScanCubeModal
        apiReady
        solveDisabledReason="Generated tables are loading."
        solving={false}
        onClose={vi.fn()}
      />,
    )

    solveButton = screen.getByRole('button', { name: 'Solve scanned cube' })
    expect(solveButton).toBeDisabled()

    await user.hover(solveButton.parentElement!)
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Generated tables are loading.')
    expect(apiMocks.solveSessionMutateAsync).not.toHaveBeenCalled()
  })

  it('renders camera errors and disables capture controls', () => {
    apiMocks.cameraState = { message: 'Camera blocked.', status: 'error' }

    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('Camera blocked. You can still fill the grid manually.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Auto scan on' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Scan face' })).toBeDisabled()
  })

  it('pauses auto scan and ignores navigation to the active face', async () => {
    const user = userEvent.setup()
    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Auto scan on' }))

    expect(screen.getByRole('button', { name: 'Auto scan off' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('Auto scan paused. Turn it on when the face is visible.')).toBeInTheDocument()

    const resetCalls = apiMocks.analyzeReset.mock.calls.length
    await user.click(screen.getByRole('button', { name: /Go to Green face/ }))

    expect(apiMocks.analyzeReset).toHaveBeenCalledTimes(resetCalls)
    expect(liveScanMocks.resetAutoFill).toHaveBeenCalled()
  })

  it('shows the optional CNN evidence status', () => {
    const { rerender } = render(
      <ScanCubeModal
        apiReady
        solving={false}
        visionCnnAvailable
        visionTileDetectorAvailable
        visionOk
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('CNN evidence active')).toBeInTheDocument()
    expect(screen.getByText('Sticker detector active')).toBeInTheDocument()

    rerender(
      <ScanCubeModal
        apiReady
        solving={false}
        visionCnnAvailable={false}
        visionCnnReason="cnn_model_not_configured"
        visionTileDetectorAvailable={false}
        visionTileDetectorReason="tile_detector_model_not_configured"
        visionOk
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('Color-only fallback: cnn_model_not_configured')).toBeInTheDocument()
    expect(screen.getByText('Sticker detector fallback: tile_detector_model_not_configured')).toBeInTheDocument()

    rerender(
      <ScanCubeModal
        apiReady
        solving={false}
        visionOk={false}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getAllByText('Vision status unavailable')).toHaveLength(2)
  })

  it('does not fill the review grid when the detected center is a different color', () => {
    liveScanMocks.autoRecognize = true
    liveScanMocks.analysisOverrides = { centerMismatch: true }

    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Confirm face' })).toBeDisabled()
    expect(screen.getByTestId('scan-sticker-4')).toHaveAccessibleName(/Green/)
    expect(screen.queryByText(/9 stickers recognized/)).not.toBeInTheDocument()
  })

  it('clears the current live review while keeping carousel navigation visible', async () => {
    const user = userEvent.setup()

    const { rerender } = render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Clear face' })).toBeDisabled()

    liveScanMocks.autoRecognize = true
    rerender(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
      />,
    )

    await screen.findByText(/9 stickers recognized/)
    expect(screen.getByRole('button', { name: 'Clear face' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Confirm face' })).toBeEnabled()

    liveScanMocks.autoRecognize = false
    await user.click(screen.getByRole('button', { name: 'Clear face' }))

    expect(screen.getByRole('button', { name: 'Confirm face' })).toBeDisabled()
    expect(liveScanMocks.resetAutoFill).toHaveBeenCalled()
  })

  it('pauses live preview after auto recognition fills the current face', async () => {
    liveScanMocks.autoRecognize = true

    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
      />,
    )

    await screen.findByText(/9 stickers recognized/)
    await waitFor(() => expect(liveScanMocks.enabledValues).toContain(false))
  })

  it('fills the review grid from sticker detector boxes when sampled stickers disagree', async () => {
    liveScanMocks.autoRecognize = true
    liveScanMocks.analysisOverrides = {
      stickerSymbol: 'R',
      tileSymbols: 'LRRFFFFFD',
    }

    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
      />,
    )

    await screen.findByText(/9 stickers recognized/)

    expect(screen.getByTestId('scan-sticker-0')).toHaveAccessibleName(/Orange/)
    expect(screen.getByTestId('scan-sticker-1')).toHaveAccessibleName(/Red/)
    expect(screen.getByTestId('scan-sticker-4')).toHaveAccessibleName(/Green/)
  })

  it('reports uncertain live auto recognition when sticker confidence is low', async () => {
    liveScanMocks.autoRecognize = true
    liveScanMocks.analysisOverrides = { tileConfidence: 0.12 }

    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
      />,
    )

    expect(await screen.findByText('8 detected colors are uncertain. Review the highlighted squares or clear the face to scan again.')).toBeInTheDocument()
  })

  it('keeps a confirmed face available when navigating away and back', async () => {
    const user = userEvent.setup()
    liveScanMocks.autoRecognize = true

    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
      />,
    )

    await screen.findByText(/9 stickers recognized/)
    await user.click(screen.getByRole('button', { name: 'Confirm face' }))

    expect(await screen.findByRole('heading', { name: 'Red face' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Previous' }))

    expect(await screen.findByRole('heading', { name: 'Green face' })).toBeInTheDocument()
    expect(screen.getByTestId('scan-sticker-0')).toHaveAccessibleName(/Green/)
    expect(screen.getByRole('button', { name: 'Update face' })).toBeEnabled()
  })

  it('persists manual edits when revisiting a confirmed face', async () => {
    const user = userEvent.setup()
    liveScanMocks.autoRecognize = true

    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
      />,
    )

    await screen.findByText(/9 stickers recognized/)
    await user.click(screen.getByRole('button', { name: 'Confirm face' }))
    await user.click(screen.getByRole('button', { name: 'Previous' }))
    await user.click(screen.getByTestId('scan-sticker-0'))
    await user.click(screen.getByRole('button', { name: 'Red' }))

    expect(screen.getByTestId('scan-sticker-0')).toHaveAccessibleName(/Red/)

    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Previous' }))

    expect(screen.getByTestId('scan-sticker-0')).toHaveAccessibleName(/Red/)
  })

  it('explains why a scan session is not ready to solve', async () => {
    const user = userEvent.setup()
    liveScanMocks.autoRecognize = true

    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Solve scanned cube' })).toBeDisabled()

    await confirmAllFaces(user)

    expect(screen.getByRole('button', { name: 'Solve scanned cube' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: /Go to Green face/ }))
    liveScanMocks.autoRecognize = false
    await user.click(screen.getByRole('button', { name: 'Clear face' }))

    const solveButton = screen.getByRole('button', { name: 'Solve scanned cube' })
    expect(solveButton).toBeDisabled()

    await user.hover(solveButton.parentElement!)

    expect(await screen.findByRole('tooltip')).toHaveTextContent('Confirm these faces before solving: G.')
    expect(apiMocks.solveSessionMutateAsync).not.toHaveBeenCalled()
  })

  it('requires recognized photos after manually confirmed faces', async () => {
    const user = userEvent.setup()

    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
      />,
    )

    for (const face of scanFaceOrder) {
      await screen.findByRole('heading', { name: face.label })
      await fillCurrentFaceManually(user, face.symbol)
      await user.click(screen.getByRole('button', { name: 'Confirm face' }))
    }

    const solveButton = screen.getByRole('button', { name: 'Solve scanned cube' })
    expect(solveButton).toBeDisabled()

    await user.hover(solveButton.parentElement!)

    expect(await screen.findByRole('tooltip')).toHaveTextContent('Recognize these faces before solving: G, R, B, O, W, Y.')
    expect(apiMocks.solveSessionMutateAsync).not.toHaveBeenCalled()
  })

  it('allows reviewing a manually filled 2x2 without recognized photos', async () => {
    const user = userEvent.setup()

    render(
      <ScanCubeModal
        apiReady
        puzzleSlug="cube-2x2x2"
        solving={false}
        onClose={vi.fn()}
      />,
    )

    await confirmAllEvenFacesManually(user)

    const reviewButton = screen.getByRole('button', { name: 'Review assembled cube' })
    expect(reviewButton).toBeEnabled()

    await user.click(reviewButton)

    expect(await screen.findByRole('heading', { name: 'Review assembled cube' })).toBeInTheDocument()
    expect(apiMocks.solveSessionMutateAsync).not.toHaveBeenCalled()
  })

  it('shows a cube loader on the final 2x2 accept button while scan solve is pending', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <ScanCubeModal
        apiReady
        puzzleSlug="cube-2x2x2"
        solving={false}
        onClose={vi.fn()}
      />,
    )

    await confirmAllEvenFacesManually(user)
    await user.click(screen.getByRole('button', { name: 'Review assembled cube' }))
    expect(await screen.findByRole('heading', { name: 'Review assembled cube' })).toBeInTheDocument()

    apiMocks.solveSessionIsPending = true
    rerender(
      <ScanCubeModal
        apiReady
        puzzleSlug="cube-2x2x2"
        solving={false}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Loading' })).toBeDisabled()
  })

  it('closes the 2x2 final review after an accepted solve response', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onSessionSolveResult = vi.fn()
    render(
      <ScanCubeModal
        apiReady
        puzzleSlug="cube-2x2x2"
        solving={false}
        onClose={onClose}
        onSessionSolveResult={onSessionSolveResult}
      />,
    )

    await confirmAllEvenFacesManually(user)
    await user.click(screen.getByRole('button', { name: 'Review assembled cube' }))
    await user.click(await screen.findByRole('button', { name: 'Accept and solve' }))

    await waitFor(() => expect(onSessionSolveResult).toHaveBeenCalledWith(expect.objectContaining({ ok: true })))
    expect(onClose).toHaveBeenCalled()
  })

  it('submits the full scan session and closes on accepted solve', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onSessionSolveResult = vi.fn()
    liveScanMocks.autoRecognize = true

    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={onClose}
        onSessionSolveResult={onSessionSolveResult}
      />,
    )

    await confirmAllFaces(user)
    await user.click(screen.getByRole('button', { name: 'Solve scanned cube' }))

    await waitFor(() => expect(apiMocks.solveSessionMutateAsync).toHaveBeenCalledTimes(1))
    expect(apiMocks.solveSessionMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        faces: expect.arrayContaining([
          expect.objectContaining({
            expectedTop: 'U',
            image: 'data:image/jpeg;base64,scan',
            reviewedStickers: expect.any(Array),
            symbol: 'F',
          }),
          expect.objectContaining({ expectedTop: 'F', reviewedStickers: expect.any(Array), symbol: 'U' }),
        ]),
        maxDepth: 30,
      }),
    )
    expect(onSessionSolveResult).toHaveBeenCalledWith(expect.objectContaining({ ok: true, status: 'success' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('closes and returns terminal scan solve failures to the page', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onSessionSolveResult = vi.fn()
    liveScanMocks.autoRecognize = true
    apiMocks.solveSessionMutateAsync.mockResolvedValue({
      ...scanSessionAccepted(),
      ok: false,
      solve: scanSolveFailure(),
      status: 'api_error',
    })

    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={onClose}
        onSessionSolveResult={onSessionSolveResult}
      />,
    )

    await confirmAllFaces(user)
    await user.click(screen.getByRole('button', { name: 'Solve scanned cube' }))

    await waitFor(() => expect(onSessionSolveResult).toHaveBeenCalledWith(scanSolveFailure()))
    expect(onClose).toHaveBeenCalled()
  })

  it('navigates to backend rescan targets', async () => {
    const user = userEvent.setup()
    liveScanMocks.autoRecognize = true
    apiMocks.solveSessionMutateAsync.mockResolvedValue(
      scanSessionRejected({
        message: undefined,
        rescanFaces: ['B'],
        status: 'needs_rescan_face',
      }),
    )
    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
      />,
    )

    await confirmAllFaces(user)
    await user.click(screen.getByRole('button', { name: 'Solve scanned cube' }))

    expect(await screen.findByRole('heading', { name: 'Blue face' })).toBeInTheDocument()
    expect(screen.getByText('One or more faces need to be rescanned.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Go to Blue face, review/ })).toHaveAttribute(
      'aria-current',
      'step',
    )
  })

  it('explains glare quality reasons from scan session rejects', async () => {
    const user = userEvent.setup()
    liveScanMocks.autoRecognize = true
    apiMocks.solveSessionMutateAsync.mockResolvedValue(
      scanSessionRejected({
        message: 'One or more faces need to be rescanned.',
        qualityReasons: ['image_glare:F', 'image_glare:R'],
        rescanFaces: ['F', 'R'],
        status: 'needs_rescan_face',
      }),
    )
    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
      />,
    )

    await confirmAllFaces(user)
    await user.click(screen.getByRole('button', { name: 'Solve scanned cube' }))

    expect(await screen.findByText('Too much glare on faces G, R. Reduce reflections and rescan those faces.')).toBeInTheDocument()
  })

  it('highlights backend manual confirmation targets', async () => {
    const user = userEvent.setup()
    liveScanMocks.autoRecognize = true
    apiMocks.solveSessionMutateAsync.mockResolvedValue(
      scanSessionRejected({
        manualTargets: [{ face: 'R', stickers: [0, 2] }],
        message: undefined,
        status: 'needs_manual_confirmation',
      }),
    )
    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
      />,
    )

    await confirmAllFaces(user)
    await user.click(screen.getByRole('button', { name: 'Solve scanned cube' }))

    expect(await screen.findByRole('heading', { name: 'Red face' })).toBeInTheDocument()
    expect(screen.getByTestId('scan-sticker-0')).toHaveAccessibleName(/needs confirmation/)
    expect(screen.getByTestId('scan-sticker-2')).toHaveAccessibleName(/needs confirmation/)

    await user.click(screen.getByTestId('scan-sticker-0'))
    await user.click(screen.getByRole('button', { name: 'Red' }))

    expect(screen.getByTestId('scan-sticker-0')).not.toHaveAccessibleName(/needs confirmation/)
    expect(screen.getByTestId('scan-sticker-2')).toHaveAccessibleName(/needs confirmation/)

    await user.click(screen.getByTestId('scan-sticker-2'))
    await user.click(screen.getByRole('button', { name: 'Red' }))

    expect(screen.getByTestId('scan-sticker-2')).not.toHaveAccessibleName(/needs confirmation/)
  })

  it('explains invalid 2x2 corner targets from the backend', async () => {
    const user = userEvent.setup()
    liveScanMocks.autoRecognize = true
    apiMocks.solveSessionMutateAsync.mockResolvedValue(
      scanSessionRejected({
        invalidCorners: [
          {
            faces: ['U', 'R', 'F'],
            position: 'Urf',
            reason: 'opposite_faces',
            stickers: ['B', 'R', 'L'],
            targets: [
              { face: 'U', index: 3 },
              { face: 'R', index: 0 },
              { face: 'F', index: 1 },
            ],
          },
        ],
        manualTargets: [
          { face: 'U', stickers: [3] },
          { face: 'R', stickers: [0] },
          { face: 'F', stickers: [1] },
        ],
        message: undefined,
        status: 'invalid_cube_state',
      }),
    )
    render(
      <ScanCubeModal
        apiReady
        puzzleSlug="cube-2x2x2"
        solving={false}
        onClose={vi.fn()}
      />,
    )

    await confirmAllFaces(user, ['Front side', 'Right side', 'Back side', 'Left side', 'Up side', 'Down side'])
    await user.click(screen.getByRole('button', { name: 'Review assembled cube' }))
    expect(await screen.findByRole('heading', { name: 'Review assembled cube' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Accept and solve' }))

    expect(await screen.findByRole('heading', { name: 'Review assembled cube' })).toBeInTheDocument()
    expect(screen.getByText(/Urf .*Blue\/Red\/Orange/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Accept and solve' })).toBeDisabled()
  })

  it('does not render redundant 2x2 net swap buttons', async () => {
    const user = userEvent.setup()
    liveScanMocks.autoRecognize = true
    render(
      <ScanCubeModal
        apiReady
        puzzleSlug="cube-2x2x2"
        solving={false}
        onClose={vi.fn()}
      />,
    )

    await confirmAllFaces(user, ['Front side', 'Right side', 'Back side', 'Left side', 'Up side', 'Down side'])
    await user.click(screen.getByRole('button', { name: 'Review assembled cube' }))

    expect(await screen.findByText(/Selected slot: Front side .* captured face: Front side/)).toBeInTheDocument()
    expect(screen.queryByText('Swap selected face with')).not.toBeInTheDocument()
  })

  it('keeps backend manual targets when editing a different sticker', async () => {
    const user = userEvent.setup()
    liveScanMocks.autoRecognize = true
    apiMocks.solveSessionMutateAsync.mockResolvedValue(
      scanSessionRejected({
        manualTargets: [{ face: 'R', stickers: [0] }],
        message: undefined,
        status: 'needs_manual_confirmation',
      }),
    )
    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
      />,
    )

    await confirmAllFaces(user)
    await user.click(screen.getByRole('button', { name: 'Solve scanned cube' }))
    expect(await screen.findByRole('heading', { name: 'Red face' })).toBeInTheDocument()

    await user.click(screen.getByTestId('scan-sticker-2'))
    await user.click(screen.getByRole('button', { name: 'Red' }))

    expect(screen.getByTestId('scan-sticker-0')).toHaveAccessibleName(/needs confirmation/)
  })

  it.each([
    ['invalid_cube_state', 'The scan does not describe a valid cube. Review the faces and rescan unclear stickers.'],
    ['orientation_ambiguous', 'The backend found more than one valid cube state. Review the highlighted stickers or rescan unclear faces.'],
    ['vision_unavailable', 'The vision service could not complete the session. Retry after the vision service is available.'],
    ['vision_error', 'The vision service could not complete the session. Retry after the vision service is available.'],
    ['unexpected_backend_status', 'The scan session was rejected. Review the faces before solving.'],
  ] as const)('shows %s scan session reject messages', async (status, message) => {
    const user = userEvent.setup()
    liveScanMocks.autoRecognize = true
    apiMocks.solveSessionMutateAsync.mockResolvedValue(
      scanSessionRejected({ message: undefined, status }),
    )
    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
      />,
    )

    await confirmAllFaces(user)
    await user.click(screen.getByRole('button', { name: 'Solve scanned cube' }))

    expect(await screen.findByText(message)).toBeInTheDocument()
  })

  it('prefers explicit backend scan session messages', async () => {
    const user = userEvent.setup()
    liveScanMocks.autoRecognize = true
    apiMocks.solveSessionMutateAsync.mockResolvedValue(
      scanSessionRejected({ message: 'Review the red stickers again.', status: 'needs_manual_confirmation' }),
    )
    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
      />,
    )

    await confirmAllFaces(user)
    await user.click(screen.getByRole('button', { name: 'Solve scanned cube' }))

    expect(await screen.findByText('Review the red stickers again.')).toBeInTheDocument()
  })

  it.each([
    ['image_blurry:F', 'Image is blurry on faces G. Hold the cube steady and rescan those faces.'],
    ['image_shadow:F', 'Too much shadow on faces G. Add more even light and rescan those faces.'],
  ] as const)('explains %s quality reasons from scan session rejects', async (qualityReason, message) => {
    const user = userEvent.setup()
    liveScanMocks.autoRecognize = true
    apiMocks.solveSessionMutateAsync.mockResolvedValue(
      scanSessionRejected({
        message: undefined,
        qualityReasons: [qualityReason],
        rescanFaces: ['F'],
        status: 'needs_rescan_face',
      }),
    )
    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
      />,
    )

    await confirmAllFaces(user)
    await user.click(screen.getByRole('button', { name: 'Solve scanned cube' }))

    expect(await screen.findByText(message)).toBeInTheDocument()
  })

  it('keeps ambiguous scan sessions open for review', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    liveScanMocks.autoRecognize = true
    apiMocks.solveSessionMutateAsync.mockResolvedValue(
      scanSessionRejected({ message: undefined, status: 'state_ambiguous' }),
    )
    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={onClose}
      />,
    )

    await confirmAllFaces(user)
    await user.click(screen.getByRole('button', { name: 'Solve scanned cube' }))

    expect(await screen.findByText(/more than one valid cube state/)).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('jumps directly to a face from the carousel indicators', async () => {
    const user = userEvent.setup()

    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /Go to Red face/ }))

    expect(screen.getByRole('heading', { name: 'Red face' })).toBeInTheDocument()
  })

  it('reattaches the camera stream when the active face changes', async () => {
    const user = userEvent.setup()
    const play = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: play,
    })
    Object.defineProperty(HTMLMediaElement.prototype, 'srcObject', {
      configurable: true,
      value: null,
      writable: true,
    })

    const { container } = render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
      />,
    )
    const greenVideo = container.querySelector('video')

    await waitFor(() => expect(greenVideo?.srcObject).toBe(apiMocks.cameraStream))
    const initialPlayCalls = play.mock.calls.length

    await user.click(screen.getByRole('button', { name: /Go to Red face/ }))
    const redVideo = container.querySelector('video')

    expect(redVideo).not.toBe(greenVideo)
    await waitFor(() => expect(greenVideo?.srcObject).toBeNull())
    await waitFor(() => expect(redVideo?.srcObject).toBe(apiMocks.cameraStream))
    await waitFor(() => expect(play.mock.calls.length).toBeGreaterThan(initialPlayCalls))
  })

  it('does not enter review when live analysis uses an unsupported mode', () => {
    liveScanMocks.autoRecognize = true
    liveScanMocks.analysisOverrides = { detectionMode: 'legacy_geometry' }

    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('Looking for cube face.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm face' })).toBeDisabled()
  })

  it('fills the review grid from a manual photo capture', async () => {
    const user = userEvent.setup()
    apiMocks.analyzeMutateAsync.mockResolvedValue(scanAnalysisResponse({ symbol: 'F' }))

    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Scan face' }))

    await waitFor(() => {
      expect(apiMocks.analyzeMutateAsync).toHaveBeenCalledWith({
        expectedCenter: 'F',
        gridSize: 3,
        image: 'data:image/jpeg;base64,manual-scan',
        knownCenters: {},
      })
    })
    expect(captureScanImageMock).toHaveBeenCalledWith(expect.any(HTMLVideoElement), apiMocks.cameraStream)
    expect(await screen.findByText(/Photo captured/)).toBeInTheDocument()
    expect(screen.getByTestId('scan-sticker-0')).toHaveAccessibleName(/Green/)
    expect(screen.getByTestId('scan-sticker-4')).toHaveAccessibleName(/Green/)
    expect(screen.queryByText('9/9 stickers ready')).not.toBeInTheDocument()
    expect(screen.queryByText('stickers 90%')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm face' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Scan again' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Red' }))
    expect(screen.getByTestId('scan-sticker-4')).toHaveAccessibleName(/Green/)
  })

  it('reports failed manual captures and failed analysis requests', async () => {
    const user = userEvent.setup()
    captureScanImageMock.mockResolvedValueOnce(undefined)
    const { rerender } = render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Scan face' }))

    expect(await screen.findByText('Could not read a camera frame. Try again.')).toBeInTheDocument()

    apiMocks.analyzeMutateAsync.mockRejectedValueOnce(new Error('analysis transport failed'))
    rerender(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Scan face' }))

    expect(await screen.findByText('analysis transport failed')).toBeInTheDocument()

    apiMocks.analyzeMutateAsync.mockRejectedValueOnce('plain analysis failure')
    rerender(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Scan face' }))

    expect(await screen.findByText('The scan analysis request failed.')).toBeInTheDocument()
  })

  it('keeps incomplete manual detections out of review', async () => {
    const user = userEvent.setup()
    apiMocks.analyzeMutateAsync.mockResolvedValue({
      ...scanAnalysisResponse({ symbol: 'F', tileSymbols: '' }),
      ok: false,
      status: 'face_not_found',
    })

    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Scan face' }))

    expect(await screen.findByText('Could not detect a cube face. Retake the photo or fill the grid manually.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm face' })).toBeDisabled()
  })

  it.each([
    ['detected', 'FFF', 'Could not detect a cube face. Retake the photo or fill the grid manually.'],
    ['low_confidence', '', 'Detection confidence is low.'],
    ['invalid_image', '', 'The scan analysis request failed.'],
  ] as const)('reports %s incomplete manual detections', async (status, tileSymbols, message) => {
    const user = userEvent.setup()
    apiMocks.analyzeMutateAsync.mockResolvedValue({
      ...scanAnalysisResponse({ symbol: 'F', tileSymbols }),
      ok: false,
      status,
    })

    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Scan face' }))

    expect(await screen.findByText(message)).toBeInTheDocument()
  })

  it('uses fallback copy when center mismatch colors are missing', async () => {
    const user = userEvent.setup()
    apiMocks.analyzeMutateAsync.mockResolvedValue({
      ...scanAnalysisResponse({ centerMismatch: true, symbol: 'F' }),
      detectedCenter: undefined,
      detectedCenterConfidence: 0,
      expectedCenter: undefined,
    })

    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Scan face' }))

    expect(await screen.findByText(/Captured center does not match this scan step/)).toBeInTheDocument()
  })

  it('requires explicit confirmation for manual center mismatches', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    apiMocks.analyzeMutateAsync.mockResolvedValue(scanAnalysisResponse({ centerMismatch: true, symbol: 'F' }))

    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={onClose}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Scan face' }))
    await screen.findByText(/Center looks W \/ White/)
    await user.click(screen.getByRole('button', { name: 'Confirm face' }))

    expect(screen.getByRole('dialog', { name: 'Confirm expected face' })).toBeInTheDocument()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog', { name: 'Confirm expected face' })).not.toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Confirm face' }))
    await user.click(screen.getByRole('button', { name: 'Confirm anyway' }))

    expect(await screen.findByRole('heading', { name: 'Red face' })).toBeInTheDocument()
  })

  it('surfaces manual capture quality warnings', async () => {
    const user = userEvent.setup()
    apiMocks.analyzeMutateAsync.mockResolvedValue({
      ...scanAnalysisResponse({ symbol: 'F' }),
      faceConfidence: 0.4,
      qualityWarnings: ['image_blurry'],
      status: 'low_confidence',
      warnings: ['image_too_dark', 'image_too_bright'],
    })

    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Scan face' }))

    expect(await screen.findByText(/Detection confidence is low\./)).toHaveTextContent(
      'Detection confidence is low. Hold the cube steady for a sharper photo. Add more light before scanning. Reduce glare before scanning. Photo captured. Review the colors before confirming this face.',
    )
  })

  it('reports uncertain manual captures when sticker confidence is low', async () => {
    const user = userEvent.setup()
    const lowConfidenceAnalysis = scanAnalysisResponse({ symbol: 'F' })
    apiMocks.analyzeMutateAsync.mockResolvedValue({
      ...lowConfidenceAnalysis,
      stickers: lowConfidenceAnalysis.stickers.map((sticker) => ({ ...sticker, confidence: 0.12 })),
      tileDetections: lowConfidenceAnalysis.tileDetections?.map((tile) => ({ ...tile, confidence: 0.12 })),
    })

    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Scan face' }))

    expect(await screen.findByText('8 detected colors are uncertain. Review the highlighted squares or clear the face to scan again.')).toBeInTheDocument()
  })

  it('updates an already confirmed face after all faces are complete', async () => {
    const user = userEvent.setup()
    liveScanMocks.autoRecognize = true

    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
      />,
    )

    await confirmAllFaces(user)
    await user.click(screen.getByRole('button', { name: /Go to Green face/ }))
    await user.click(screen.getByRole('button', { name: 'Update face' }))

    expect(screen.getByText('Face updated. Review the other faces or solve when ready.')).toBeInTheDocument()
  })

  it.each([
    [new Error('session transport failed'), 'session transport failed'],
    ['plain rejection', 'The scan solve request failed.'],
  ] as const)('reports rejected scan session submissions', async (error, message) => {
    const user = userEvent.setup()
    liveScanMocks.autoRecognize = true
    apiMocks.solveSessionMutateAsync.mockRejectedValueOnce(error)

    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
      />,
    )

    await confirmAllFaces(user)
    await user.click(screen.getByRole('button', { name: 'Solve scanned cube' }))

    expect(await screen.findByText(message)).toBeInTheDocument()
  })

})

async function confirmAllFaces(
  user: ReturnType<typeof userEvent.setup>,
  labels: readonly string[] = scanFaceOrder.map((face) => face.label),
) {
  for (let faceIndex = 0; faceIndex < 6; faceIndex += 1) {
    await screen.findByRole('heading', { name: labels[faceIndex] })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirm face' })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: 'Confirm face' }))

    if (faceIndex < 5) {
      await screen.findByRole('heading', { name: labels[faceIndex + 1] })
    }
  }
}

async function confirmAllEvenFacesManually(user: ReturnType<typeof userEvent.setup>) {
  const labels = ['Front side', 'Right side', 'Back side', 'Left side', 'Up side', 'Down side']

  for (let faceIndex = 0; faceIndex < 6; faceIndex += 1) {
    const symbol = scanFaceOrder[faceIndex].symbol

    await screen.findByRole('heading', { name: labels[faceIndex] })
    await fillCurrentEvenFaceManually(user, symbol)
    await user.click(screen.getByRole('button', { name: 'Confirm face' }))

    if (faceIndex < 5) {
      await screen.findByRole('heading', { name: labels[faceIndex + 1] })
    }
  }
}

async function fillCurrentEvenFaceManually(
  user: ReturnType<typeof userEvent.setup>,
  symbol: ScanFaceSymbol,
) {
  for (const index of [0, 1, 2, 3]) {
    await user.click(screen.getByTestId(`scan-sticker-${index}`))
    await user.click(screen.getByRole('button', { name: scanColorName(symbol) }))
  }
}

async function fillCurrentFaceManually(
  user: ReturnType<typeof userEvent.setup>,
  symbol: ScanFaceSymbol,
) {
  for (const index of [0, 1, 2, 3, 5, 6, 7, 8]) {
    await user.click(screen.getByTestId(`scan-sticker-${index}`))
    await user.click(screen.getByRole('button', { name: scanColorName(symbol) }))
  }
}

function scanColorName(symbol: ScanFaceSymbol): string {
  switch (symbol) {
    case 'B':
      return 'Blue'
    case 'D':
      return 'Yellow'
    case 'F':
      return 'Green'
    case 'L':
      return 'Orange'
    case 'R':
      return 'Red'
    case 'U':
      return 'White'
  }
}

function capturedScanImage() {
  return {
    capturedAt: 456,
    height: 1280,
    photoDataUrl: 'data:image/jpeg;base64,manual-scan',
    source: 'canvas' as const,
    width: 1280,
  }
}

function scanAnalysisResponse({
  centerMismatch = false,
  symbol,
  tileSymbols = symbol.repeat(9),
}: {
  centerMismatch?: boolean
  symbol: ScanFaceSymbol
  tileSymbols?: string
}): AnalyzeScanFaceResponse {
  const detectedCenter = centerMismatch ? 'U' : symbol

  return {
    centerMismatch,
    confidence: centerMismatch ? 0.8 : 1,
    detectedCenter,
    detectedCenterConfidence: centerMismatch ? 0.8 : 1,
    detectionMode: 'tile_detector',
    expectedCenter: symbol,
    faceConfidence: 1,
    imageSize: { width: 1280, height: 1280 },
    ok: !centerMismatch,
    qualityWarnings: [],
    status: centerMismatch ? 'center_mismatch' : 'detected',
    stickers: [...tileSymbols].map((tileSymbol, index) => ({
      alternatives: [],
      confidence: 0.9,
      index,
      polygon: [],
      rgb: { r: 20, g: 180, b: 90 },
      symbol: tileSymbol as ScanFaceSymbol,
    })),
    tileDetections: [...tileSymbols].map((tileSymbol, index) => ({
      bbox: {
        height: 0.18,
        width: 0.18,
        x: 0.2 + (index % 3) * 0.25,
        y: 0.2 + Math.floor(index / 3) * 0.25,
      },
      confidence: 0.9,
      symbol: tileSymbol as ScanFaceSymbol,
    })),
    warnings: [],
  }
}

function scanSessionAccepted(): ScanSessionResult {
  return {
    inference: {
      candidateFacelets: 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB',
      manualTargets: [],
      rescanFaces: [],
      stateConfidence: 1,
      status: 'accepted',
    },
    manualTargets: [],
    ok: true,
    rescanFaces: [],
    solve: scanSolveSuccess(),
    status: 'accepted',
  }
}

function scanSessionRejected({
  invalidCorners,
  manualTargets = [],
  message,
  qualityReasons = [],
  rescanFaces = [],
  status,
}: Pick<ScanSessionResult, 'status'> &
  Partial<Pick<ScanSessionResult, 'invalidCorners' | 'manualTargets' | 'message' | 'rescanFaces'>> & {
    qualityReasons?: string[]
  }): ScanSessionResult {
  return {
    inference: {
      manualTargets,
      qualityReasons,
      rescanFaces,
      stateConfidence: 0.4,
      status,
    },
    invalidCorners,
    manualTargets,
    message,
    ok: false,
    rescanFaces,
    status,
  }
}

function scanSolveFailure(): SolveResult {
  return {
    exploredNodes: 12_345,
    generatedTableStatus: 'available',
    maxDepth: 20,
    maxNodes: 10_000_000,
    message: 'no solution found within limits',
    ok: false,
    solverMode: 'generated_two_phase_quality',
    status: 'not_found_within_limits',
    strategyId: 'generated-two-phase-quality',
    strategyLabel: 'Generated two-phase quality solver',
  }
}

function scanSolveSuccess(): SolveResult {
  return {
    elapsedMs: 12,
    exploredNodes: 42,
    generatedTableStatus: 'available',
    length: 1,
    maxDepth: 30,
    maxNodes: 25_000_000,
    moves: ['R'],
    ok: true,
    replayVerified: true,
    solverMode: 'generated_two_phase_quality',
    status: 'success',
    strategyId: 'generated-two-phase-quality',
    strategyLabel: 'Generated two-phase quality solver',
  }
}
