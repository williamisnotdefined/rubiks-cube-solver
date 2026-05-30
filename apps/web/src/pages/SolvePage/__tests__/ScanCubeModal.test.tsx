import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnalyzeScanFaceResponse } from '@api/scan'
import { captureScanImage } from '../scanCapture'
import { ScanCubeModal } from '../ScanCubeModal'

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
}))

const captureScanImageMock = vi.mocked(captureScanImage)

describe('ScanCubeModal', () => {
  beforeEach(() => {
    apiMocks.analyzeMutateAsync.mockReset()
    apiMocks.analyzeReset.mockReset()
    captureScanImageMock.mockReset()
    captureScanImageMock.mockReturnValue({ photoDataUrl: 'data:image/jpeg;base64,scan' })
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
    })
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

    expect(await screen.findByText(/Center looks Green.*expects White/)).toBeInTheDocument()
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
})

function scanAnalysisResponse({ centerMismatch = false } = {}): AnalyzeScanFaceResponse {
  return {
    centerMismatch,
    confidence: centerMismatch ? 0.8 : 1,
    detectedCenterConfidence: centerMismatch ? 0.8 : 1,
    detectedCenter: centerMismatch ? 'F' : 'U',
    detectionMode: 'contour',
    expectedCenter: 'U',
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
      symbol: 'U',
    })),
    warnings: [],
  }
}
