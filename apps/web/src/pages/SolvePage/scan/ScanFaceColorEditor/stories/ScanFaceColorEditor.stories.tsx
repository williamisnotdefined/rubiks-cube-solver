import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ScanFaceSymbol } from '@api/solver/types'
import { ScanFaceColorEditor } from '..'
import type { ScanSticker } from '../../scanState'

const initialStickers: ScanSticker[] = Array.from({ length: 9 }, (_, index) => ({
  confidence: 1,
  source: index === 4 ? 'center' : 'manual',
  symbol: index === 4 ? 'F' : undefined,
}))

const meta = {
  render: () => <ScanEditorStory />,
  title: 'Solve/ScanFaceColorEditor',
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {}

function ScanEditorStory() {
  const [stickers, setStickers] = useState(initialStickers)

  function updateSticker(index: number, symbol: ScanFaceSymbol) {
    setStickers((current) =>
      current.map((sticker, stickerIndex) =>
        stickerIndex === index ? { ...sticker, confidence: 1, source: 'manual', symbol } : sticker,
      ),
    )
  }

  return (
    <div className='w-[min(24rem,90vw)] rounded-lg border bg-card p-5'>
      <ScanFaceColorEditor
        centerSymbol='F'
        stickers={stickers}
        onStickerColorChange={updateSticker}
      />
    </div>
  )
}
