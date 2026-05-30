import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnalyzeScanFaceResponse } from '@api/scan'
import type { ScanFaceSymbol, SolveResult } from '@api/solver/types'
import { captureScanImage, captureScanPreviewImage } from '../scanCapture'
import { ScanCubeModal } from '../ScanCubeModal'
import { useSolveSettingsStore } from '../solveSettingsStore'

const apiMocks = vi.hoisted(() => ({
  analyzeReset: vi.fn(),
  analyzeMutateAsync: vi.fn(),
}))

vi.mock('@api/scan', async () => {
  const actual = await vi.importActual<typeof import('@api/scan')>('@api/scan')

  return {
    ...actual,
    useAnalyzeScanFace: () => ({
      mutateAsync: apiMocks.analyzeMutateAsync,
      reset: apiMocks.analyzeReset,
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
    captureScanImageMock.mockReset()
    captureScanImageMock.mockReturnValue({ photoDataUrl: 'data:image/jpeg;base64,scan' })
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

  it('clears the current photo instead of navigating to a previous face', async () => {
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

    expect(screen.queryByRole('button', { name: 'Previous' })).not.toBeInTheDocument()
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
    await user.click(screen.getByRole('button', { name: 'Solve scanned cube' }))

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
