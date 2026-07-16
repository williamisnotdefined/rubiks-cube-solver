import { useState } from 'react'
import type { ScanFaceSymbol } from '@api/solver/types'
import { ScanColorPalette } from '../ScanColorPalette'
import { ScanFaceReviewGrid } from '../ScanFaceReviewGrid'
import { scanCenterIndex, scan3StickersPerFace, type ScanSticker } from '../scanState'

type ScanFaceColorEditorProps = {
  centerSymbol: ScanFaceSymbol
  reviewTargetIndexes?: readonly number[]
  stickersPerFace?: number
  stickers: readonly ScanSticker[]
  onStickerColorChange: (index: number, symbol: ScanFaceSymbol) => void
}

export function ScanFaceColorEditor({
  centerSymbol,
  reviewTargetIndexes,
  stickersPerFace = scan3StickersPerFace,
  stickers,
  onStickerColorChange,
}: ScanFaceColorEditorProps) {
  const centerIndex = scanCenterIndex(stickersPerFace)
  const [selectedStickerIndex, setSelectedStickerIndex] = useState(centerIndex ?? 0)
  const selectedSymbol = stickers[selectedStickerIndex]?.symbol

  function handleColorSelect(symbol: ScanFaceSymbol) {
    onStickerColorChange(
      selectedStickerIndex,
      centerIndex !== undefined && selectedStickerIndex === centerIndex ? centerSymbol : symbol,
    )
  }

  return (
    <>
      <ScanFaceReviewGrid
        reviewTargetIndexes={reviewTargetIndexes}
        stickersPerFace={stickersPerFace}
        stickers={stickers}
        selectedIndex={selectedStickerIndex}
        onSelect={setSelectedStickerIndex}
      />
      <ScanColorPalette selectedSymbol={selectedSymbol} onSelect={handleColorSelect} />
    </>
  )
}
