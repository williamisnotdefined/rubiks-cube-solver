import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { captureScanFrame } from '../scanColor'
import { ScanCubeModal } from '../ScanCubeModal'
import type { ScanSticker } from '../scanState'

vi.mock('../hooks/useCameraStream', () => ({
  useCameraStream: () => ({ status: 'ready', stream: {} }),
}))

vi.mock('../scanColor', async () => {
  const actual = await vi.importActual<typeof import('../scanColor')>('../scanColor')

  return {
    ...actual,
    captureScanFrame: vi.fn(),
  }
})

const captureScanFrameMock = vi.mocked(captureScanFrame)

describe('ScanCubeModal', () => {
  beforeEach(() => {
    captureScanFrameMock.mockReset()
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
    })
  })

  it('blocks confirming a face when the captured center is a different color', async () => {
    const user = userEvent.setup()
    captureScanFrameMock.mockResolvedValue({
      centerAnalysis: {
        confidence: 0.8,
        detectedSymbol: 'F',
        expectedSymbol: 'U',
        mismatched: true,
      },
      centerRgb: { r: 38, g: 172, b: 86 },
      photoDataUrl: 'data:image/jpeg;base64,scan',
      stickers: filledStickers('U'),
    })

    render(
      <ScanCubeModal
        apiReady
        solving={false}
        onClose={vi.fn()}
        onSolve={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Take photo' }))

    expect(await screen.findByText(/Center looks Green, but this step expects White/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm face' })).toBeDisabled()
  })

  it('clears the current photo instead of navigating to a previous face', async () => {
    const user = userEvent.setup()
    captureScanFrameMock.mockResolvedValue({
      centerAnalysis: {
        confidence: 1,
        detectedSymbol: 'U',
        expectedSymbol: 'U',
        mismatched: false,
      },
      centerRgb: { r: 205, g: 210, b: 218 },
      photoDataUrl: 'data:image/jpeg;base64,scan',
      stickers: filledStickers('U'),
    })

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
  })
})

function filledStickers(symbol: NonNullable<ScanSticker['symbol']>): ScanSticker[] {
  return Array.from({ length: 9 }, (_, index) => ({
    symbol,
    rgb: { r: 205, g: 210, b: 218 },
    confidence: 1,
    source: index === 4 ? 'center' : 'detected',
  }))
}
