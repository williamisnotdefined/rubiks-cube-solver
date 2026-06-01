import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnalyzeScanFaceResponse } from '@api/scan'
import { captureScanImage, type CapturedScanImage } from '../../SolvePage/scanCapture'
import { ScanDatasetPage } from '../ScanDatasetPage'

const apiMocks = vi.hoisted(() => ({
  analyzeMutateAsync: vi.fn(),
  cameraStream: {} as MediaStream,
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

vi.mock('../../SolvePage/hooks/useCameraStream', () => ({
  useCameraStream: () => ({ status: 'ready', stream: apiMocks.cameraStream }),
}))

vi.mock('../../SolvePage/scanCapture', () => ({
  captureScanImage: vi.fn(),
}))

const captureScanImageMock = vi.mocked(captureScanImage)

describe('ScanDatasetPage', () => {
  beforeEach(() => {
    apiMocks.analyzeMutateAsync.mockReset()
    apiMocks.analyzeMutateAsync.mockResolvedValue(scanAnalysisResponse())
    captureScanImageMock.mockReset()
    captureScanImageMock.mockResolvedValue(capturedScanImage())
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
    })
  })

  it('captures and accepts a face sample', async () => {
    const user = userEvent.setup()

    render(<ScanDatasetPage />)

    await user.click(screen.getByRole('button', { name: 'Take photo' }))

    await waitFor(() => expect(apiMocks.analyzeMutateAsync).toHaveBeenCalledTimes(1))
    expect(screen.getByText('Label: FFFFFFFFF')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Accept face sample' }))

    expect(screen.getByRole('button', { name: /F saved/ })).toBeInTheDocument()
    expect(screen.getByText('Photos: 1')).toBeInTheDocument()
  })

  it('requires a complete manual label before accepting', async () => {
    const user = userEvent.setup()
    apiMocks.analyzeMutateAsync.mockResolvedValue({ ...scanAnalysisResponse(), stickers: [] })

    render(<ScanDatasetPage />)

    await user.click(screen.getByRole('button', { name: 'Take photo' }))
    await user.click(screen.getByRole('button', { name: 'Accept face sample' }))

    expect(screen.getByText('Complete all 9 sticker labels before accepting this manual sample.')).toBeInTheDocument()
  })
})

function capturedScanImage(): CapturedScanImage {
  return {
    capturedAt: 123,
    height: 1280,
    photoDataUrl: 'data:image/jpeg;base64,scan',
    source: 'canvas',
    width: 1280,
  }
}

function scanAnalysisResponse(): AnalyzeScanFaceResponse {
  return {
    centerMismatch: false,
    confidence: 1,
    detectedCenter: 'F',
    detectedCenterConfidence: 1,
    detectionMode: 'sticker_grid',
    expectedCenter: 'F',
    faceConfidence: 1,
    faceQuad: [],
    imageSize: { height: 1280, width: 1280 },
    ok: true,
    qualityWarnings: [],
    status: 'detected',
    stickers: Array.from({ length: 9 }, (_, index) => ({
      alternatives: [],
      confidence: 1,
      index,
      polygon: [],
      rgb: { b: 0, g: 200, r: 0 },
      symbol: 'F' as const,
    })),
    warnings: [],
  }
}
