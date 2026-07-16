import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ScanFaceReviewGrid } from '../ScanFaceReviewGrid'
import type { ScanSticker } from '../../scanState'

describe('ScanFaceReviewGrid', () => {
  it('labels low-confidence stickers with alternatives and review targets', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <ScanFaceReviewGrid
        reviewTargetIndexes={[0]}
        selectedIndex={1}
        stickers={stickers()}
        onSelect={onSelect}
      />,
    )

    expect(screen.getByTestId('scan-sticker-0')).toHaveAccessibleName(
      /Sticker 1 Green, needs confirmation, uncertain color, maybe Red/,
    )
    expect(screen.getByTestId('scan-sticker-0')).toHaveTextContent('or R')
    expect(screen.getByTestId('scan-sticker-1')).toHaveAccessibleName(
      /Sticker 2 Blue, uncertain color/,
    )
    expect(screen.getByTestId('scan-sticker-1')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('scan-sticker-2')).toHaveAccessibleName('Sticker 3')

    await user.click(screen.getByTestId('scan-sticker-2'))

    expect(onSelect).toHaveBeenCalledWith(2)
  })
})

function stickers(): ScanSticker[] {
  return [
    {
      alternatives: [{ confidence: 0.6, symbol: 'R' }],
      confidence: 0.2,
      source: 'detected',
      symbol: 'F',
    },
    { alternatives: [], confidence: 0.2, source: 'detected', symbol: 'B' },
    { confidence: 0, source: 'empty' },
    { confidence: 1, source: 'manual', symbol: 'D' },
    { confidence: 1, source: 'center', symbol: 'U' },
    { confidence: 1, source: 'manual', symbol: 'L' },
    { confidence: 1, source: 'manual', symbol: 'R' },
    { confidence: 1, source: 'manual', symbol: 'F' },
    { confidence: 1, source: 'manual', symbol: 'B' },
  ]
}
