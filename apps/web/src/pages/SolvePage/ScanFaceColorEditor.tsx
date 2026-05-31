import { useState } from 'react'
import type { ScanFaceSymbol } from '@api/solver/types'
import { ScanColorPalette } from './ScanColorPalette'
import { ScanFaceReviewGrid } from './ScanFaceReviewGrid'
import type { ScanSticker } from './scanState'

type ScanFaceColorEditorProps = {
  centerSymbol: ScanFaceSymbol
  reviewTargetIndexes?: readonly number[]
  stickers: readonly ScanSticker[]
  onStickerColorChange: (index: number, symbol: ScanFaceSymbol) => void
}

export function ScanFaceColorEditor({
  centerSymbol,
  reviewTargetIndexes,
  stickers,
  onStickerColorChange,
}: ScanFaceColorEditorProps) {
  const [selectedStickerIndex, setSelectedStickerIndex] = useState(4)
  const selectedSymbol = stickers[selectedStickerIndex]?.symbol

  function handleColorSelect(symbol: ScanFaceSymbol) {
    onStickerColorChange(selectedStickerIndex, selectedStickerIndex === 4 ? centerSymbol : symbol)
  }

  return (
    <>
      <ScanFaceReviewGrid
        reviewTargetIndexes={reviewTargetIndexes}
        stickers={stickers}
        selectedIndex={selectedStickerIndex}
        onSelect={setSelectedStickerIndex}
      />
      <ScanColorPalette selectedSymbol={selectedSymbol} onSelect={handleColorSelect} />
    </>
  )
}
