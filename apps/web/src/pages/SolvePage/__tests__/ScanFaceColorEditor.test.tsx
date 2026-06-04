import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ScanFaceColorEditor } from '../ScanFaceColorEditor'
import type { ScanSticker } from '../scanState'

describe('ScanFaceColorEditor', () => {
  it('keeps the center color fixed and edits non-center stickers from the palette', async () => {
    const user = userEvent.setup()
    const onStickerColorChange = vi.fn()
    render(
      <ScanFaceColorEditor
        centerSymbol="F"
        stickers={stickers()}
        onStickerColorChange={onStickerColorChange}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Red' }))
    expect(onStickerColorChange).toHaveBeenLastCalledWith(4, 'F')

    await user.click(screen.getByTestId('scan-sticker-0'))
    await user.click(screen.getByRole('button', { name: 'Red' }))

    expect(onStickerColorChange).toHaveBeenLastCalledWith(0, 'R')
  })
})

function stickers(): ScanSticker[] {
  return Array.from({ length: 9 }, (_, index) => ({
    confidence: 1,
    source: index === 4 ? 'center' : 'manual',
    symbol: 'F',
  }))
}
