import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnalyzeScanFaceResponse, ScanSessionResult } from '@api/scan'
import type { ScanFaceSymbol, SolveResult } from '@api/solver/types'
import { captureScanImage, captureScanPreviewImage, type CapturedScanImage } from '../scanCapture'
import { ScanCubeModal } from '../ScanCubeModal'
import { useSolveSettingsStore } from '../solveSettingsStore'

const apiMocks = vi.hoisted(() => ({
  analyzeReset: vi.fn(),
  analyzeMutateAsync: vi.fn(),
  solveSessionMutateAsync: vi.fn(),
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
      isPending: false,
      mutateAsync: apiMocks.solveSessionMutateAsync,
    }),
  }
})

vi.mock('../hooks/useCameraStream', () => ({
  useCameraStream: () => ({ status: 'ready', stream: {} }),
}))

vi.mock('../scanCapture', () => ({
  captureScanImage: vi.fn(),
  captureScanPreviewImage: vi.fn(),
}))

const captureScanImageMock = vi.mocked(captureScanImage)
const captureScanPreviewImageMock = vi.mocked(captureScanPreviewImage)

describe('ScanCubeModal', () => {
  beforeEach(() => {
    apiMocks.analyzeMutateAsync.mockReset()
    apiMocks.analyzeReset.mockReset()
    apiMocks.solveSessionMutateAsync.mockReset()
    apiMocks.solveSessionMutateAsync.mockResolvedValue(scanSessionAccepted())
    captureScanImageMock.mockReset()
    captureScanImageMock.mockResolvedValue(capturedScanImage())
    captureScanPreviewImageMock.mockReset()
    captureScanPreviewImageMock.mockReturnValue(undefined)
    useSolveSettingsStore.getState().resetSolveSettings()
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
    })
  })

  it('shows a loader in the solve button while solving the scan', () => {
    render(
      <ScanCubeModal
        apiReady
        solving
        onClose={vi.fn()}
        onSolve={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Loading' })).toBeDisabled()
    expect(screen.queryByText('Solving scan')).not.toBeInTheDocument()
  })

  it('blocks confirming a face when the captured center is a different color', async () => {
    const user = userEvent.setup()
    apiMocks.analyzeMutateAsync.mockResolvedValue(scanAnalysisResponse({ centerMismatch: true }))

    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
        onSolve={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Take photo' }))

    expect(await screen.findByText(/Center looks White.*expects Green/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm face' })).toBeDisabled()
  })

  it('clears the current photo while keeping carousel navigation visible', async () => {
    const user = userEvent.setup()
    apiMocks.analyzeMutateAsync.mockResolvedValue(scanAnalysisResponse())

    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
        onSolve={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Clear photo' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Take photo' }))

    expect(await screen.findByAltText('Captured cube face')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear photo' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Confirm face' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Clear photo' }))

    await waitFor(() => {
      expect(screen.queryByAltText('Captured cube face')).not.toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Confirm face' })).toBeDisabled()
    expect(apiMocks.analyzeReset).toHaveBeenCalled()
  })

  it('keeps a confirmed face available when navigating away and back', async () => {
    const user = userEvent.setup()
    apiMocks.analyzeMutateAsync.mockImplementation(
      async ({ expectedCenter }: { expectedCenter: ScanFaceSymbol }) =>
        scanAnalysisResponse({ symbol: expectedCenter }),
    )

    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
        onSolve={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Take photo' }))
    await screen.findByAltText('Captured cube face')
    await user.click(screen.getByRole('button', { name: 'Confirm face' }))

    expect(await screen.findByRole('heading', { name: 'Red face' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Previous' }))

    expect(await screen.findByRole('heading', { name: 'Green face' })).toBeInTheDocument()
    expect(screen.getByAltText('Captured cube face')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Update face' })).toBeEnabled()
  })

  it('persists manual edits when revisiting a confirmed face', async () => {
    const user = userEvent.setup()
    apiMocks.analyzeMutateAsync.mockImplementation(
      async ({ expectedCenter }: { expectedCenter: ScanFaceSymbol }) =>
        scanAnalysisResponse({ symbol: expectedCenter }),
    )

    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
        onSolve={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Take photo' }))
    await screen.findByAltText('Captured cube face')
    await user.click(screen.getByRole('button', { name: 'Confirm face' }))
    await user.click(screen.getByRole('button', { name: 'Previous' }))
    await user.click(screen.getByTestId('scan-sticker-0'))
    await user.click(screen.getByRole('button', { name: 'Red' }))

    expect(screen.getByTestId('scan-sticker-0')).toHaveAccessibleName(/Red/)

    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Previous' }))

    expect(screen.getByTestId('scan-sticker-0')).toHaveAccessibleName(/Red/)
  })

  it('disables solving when a confirmed face is cleared', async () => {
    const user = userEvent.setup()
    apiMocks.analyzeMutateAsync.mockImplementation(
      async ({ expectedCenter }: { expectedCenter: ScanFaceSymbol }) =>
        scanAnalysisResponse({ symbol: expectedCenter }),
    )

    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
        onSolve={vi.fn()}
      />,
    )

    await confirmAllFaces(user)

    expect(screen.getByRole('button', { name: 'Solve scanned cube' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: /Go to Green face/ }))
    await user.click(screen.getByRole('button', { name: 'Clear photo' }))

    expect(screen.getByRole('button', { name: 'Solve scanned cube' })).toBeDisabled()
  })

  it('submits the full scan session and closes on accepted solve', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onSessionAccepted = vi.fn()
    apiMocks.analyzeMutateAsync.mockImplementation(
      async ({ expectedCenter }: { expectedCenter: ScanFaceSymbol }) =>
        scanAnalysisResponse({ symbol: expectedCenter }),
    )

    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={onClose}
        onSolve={vi.fn()}
        onSessionAccepted={onSessionAccepted}
      />,
    )

    await confirmAllFaces(user)
    await user.click(screen.getByRole('button', { name: 'Solve scanned cube' }))

    await waitFor(() => expect(apiMocks.solveSessionMutateAsync).toHaveBeenCalledTimes(1))
    expect(apiMocks.solveSessionMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        faces: expect.arrayContaining([
          expect.objectContaining({ expectedTop: 'U', image: 'data:image/jpeg;base64,scan', symbol: 'F' }),
          expect.objectContaining({ expectedTop: 'F', image: 'data:image/jpeg;base64,scan', symbol: 'U' }),
        ]),
        maxDepth: 30,
      }),
    )
    expect(onSessionAccepted).toHaveBeenCalledWith(expect.objectContaining({ ok: true, status: 'success' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('navigates to backend rescan targets', async () => {
    const user = userEvent.setup()
    apiMocks.solveSessionMutateAsync.mockResolvedValue(
      scanSessionRejected({
        message: undefined,
        rescanFaces: ['B'],
        status: 'needs_rescan_face',
      }),
    )
    apiMocks.analyzeMutateAsync.mockImplementation(
      async ({ expectedCenter }: { expectedCenter: ScanFaceSymbol }) =>
        scanAnalysisResponse({ symbol: expectedCenter }),
    )

    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
        onSolve={vi.fn()}
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

  it('highlights backend manual confirmation targets', async () => {
    const user = userEvent.setup()
    apiMocks.solveSessionMutateAsync.mockResolvedValue(
      scanSessionRejected({
        manualTargets: [{ face: 'R', stickers: [0, 2] }],
        message: undefined,
        status: 'needs_manual_confirmation',
      }),
    )
    apiMocks.analyzeMutateAsync.mockImplementation(
      async ({ expectedCenter }: { expectedCenter: ScanFaceSymbol }) =>
        scanAnalysisResponse({ symbol: expectedCenter }),
    )

    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
        onSolve={vi.fn()}
      />,
    )

    await confirmAllFaces(user)
    await user.click(screen.getByRole('button', { name: 'Solve scanned cube' }))

    expect(await screen.findByRole('heading', { name: 'Red face' })).toBeInTheDocument()
    expect(screen.getByTestId('scan-sticker-0')).toHaveAccessibleName(/needs confirmation/)
    expect(screen.getByTestId('scan-sticker-2')).toHaveAccessibleName(/needs confirmation/)
  })

  it('keeps ambiguous scan sessions open for review', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    apiMocks.solveSessionMutateAsync.mockResolvedValue(
      scanSessionRejected({ message: undefined, status: 'state_ambiguous' }),
    )
    apiMocks.analyzeMutateAsync.mockImplementation(
      async ({ expectedCenter }: { expectedCenter: ScanFaceSymbol }) =>
        scanAnalysisResponse({ symbol: expectedCenter }),
    )

    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={onClose}
        onSolve={vi.fn()}
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
        onSolve={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /Go to Red face/ }))

    expect(screen.getByRole('heading', { name: 'Red face' })).toBeInTheDocument()
  })

  it('does not enter review when the final photo only uses guide fallback', async () => {
    const user = userEvent.setup()
    apiMocks.analyzeMutateAsync.mockResolvedValue(
      scanAnalysisResponse({ detectionMode: 'guide_fallback' }),
    )

    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
        onSolve={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Take photo' }))

    expect(await screen.findByText(/Still looking for the cube face/)).toBeInTheDocument()
    expect(screen.queryByAltText('Captured cube face')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm face' })).toBeDisabled()
  })

  it('shows an error when the final camera frame cannot be captured', async () => {
    const user = userEvent.setup()
    captureScanImageMock.mockResolvedValue(undefined)

    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
        onSolve={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Take photo' }))

    expect(await screen.findByText('Could not read a camera frame. Try again.')).toBeInTheDocument()
    expect(apiMocks.analyzeMutateAsync).not.toHaveBeenCalled()
  })

  it('opens solve settings and retries a completed scan after limit failure', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onSolve = vi
      .fn()
      .mockResolvedValueOnce(scanSolveFailure())
      .mockResolvedValueOnce(scanSolveSuccess())
    apiMocks.analyzeMutateAsync.mockImplementation(
      async ({ expectedCenter }: { expectedCenter: ScanFaceSymbol }) =>
        scanAnalysisResponse({ symbol: expectedCenter }),
    )

    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={onClose}
        onSolve={onSolve}
      />,
    )

    await confirmAllFaces(user)
    await user.click(screen.getByRole('button', { name: 'Solve reviewed colors' }))

    const retryDialog = await screen.findByRole('dialog', { name: 'Adjust solve limits' })
    await user.clear(within(retryDialog).getByLabelText('Max moves'))
    await user.type(within(retryDialog).getByLabelText('Max moves'), '30')
    await user.selectOptions(within(retryDialog).getByLabelText('Max nodes (M)'), '25')
    await user.click(within(retryDialog).getByRole('button', { name: 'Apply and retry' }))

    await waitFor(() => expect(onSolve).toHaveBeenCalledTimes(2))
    expect(onSolve).toHaveBeenNthCalledWith(2, onSolve.mock.calls[0]?.[0])
    expect(useSolveSettingsStore.getState()).toMatchObject({
      maxMovesInput: '30',
      maxNodesMillionInput: '25',
    })
    expect(onClose).toHaveBeenCalled()
  })
})

async function confirmAllFaces(user: ReturnType<typeof userEvent.setup>) {
  for (let faceIndex = 0; faceIndex < 6; faceIndex += 1) {
    await user.click(screen.getByRole('button', { name: 'Take photo' }))
    await screen.findByAltText('Captured cube face')
    await user.click(screen.getByRole('button', { name: 'Confirm face' }))

    if (faceIndex < 5) {
      await waitFor(() => expect(screen.getByRole('button', { name: 'Take photo' })).toBeEnabled())
    }
  }
}

function scanAnalysisResponse({
  centerMismatch = false,
  detectionMode = 'contour',
  symbol = 'F',
}: {
  centerMismatch?: boolean
  detectionMode?: AnalyzeScanFaceResponse['detectionMode']
  symbol?: ScanFaceSymbol
} = {}): AnalyzeScanFaceResponse {
  return {
    centerMismatch,
    confidence: centerMismatch ? 0.8 : 1,
    detectedCenterConfidence: centerMismatch ? 0.8 : 1,
    detectedCenter: centerMismatch ? 'U' : symbol,
    detectionMode,
    expectedCenter: symbol,
    faceConfidence: 1,
    faceQuad: [],
    imageSize: { width: 640, height: 640 },
    message: centerMismatch ? 'Captured center does not match the expected face.' : undefined,
    ok: !centerMismatch,
    status: centerMismatch ? 'center_mismatch' : 'detected',
    qualityWarnings: [],
    stickers: Array.from({ length: 9 }, (_, index) => ({
      alternatives: [],
      confidence: 1,
      index,
      polygon: [],
      rgb: { r: 205, g: 210, b: 218 },
      symbol,
    })),
    warnings: [],
  }
}

function capturedScanImage(): CapturedScanImage {
  return {
    capturedAt: 123,
    height: 1280,
    photoDataUrl: 'data:image/jpeg;base64,scan',
    source: 'canvas',
    width: 1280,
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
  manualTargets = [],
  message,
  rescanFaces = [],
  status,
}: Pick<ScanSessionResult, 'status'> &
  Partial<Pick<ScanSessionResult, 'manualTargets' | 'message' | 'rescanFaces'>>): ScanSessionResult {
  return {
    inference: {
      manualTargets,
      rescanFaces,
      stateConfidence: 0.4,
      status,
    },
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
