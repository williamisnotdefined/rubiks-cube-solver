import cls from 'classnames'
import type { ScanSticker } from './scanState'
import { scanSymbolDetails } from './scanState'

type ScanFaceReviewGridProps = {
  stickers: readonly ScanSticker[]
  selectedIndex: number
  onSelect: (index: number) => void
}

export function ScanFaceReviewGrid({
  stickers,
  selectedIndex,
  onSelect,
}: ScanFaceReviewGridProps) {
  return (
    <div className="grid gap-2" aria-label="Scanned face colors" role="group">
      <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#a8a8a8]">
        Review colors
      </span>
      <div className="grid aspect-square w-full max-w-[17rem] grid-cols-3 gap-2 justify-self-center">
        {stickers.map((sticker, index) => {
          const details = sticker.symbol === undefined ? undefined : scanSymbolDetails[sticker.symbol]
          const selected = selectedIndex === index
          const lowConfidence =
            index !== 4 && sticker.source === 'detected' && sticker.confidence < 0.2

          return (
            <button
              className={cls(
                'relative min-h-16 border text-sm font-extrabold uppercase tracking-[0.14em] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#f7f7f7]/50',
                selected ? 'border-[#f7f7f7]' : 'border-[#2b2b2b]',
                details === undefined ? 'bg-[#171717] text-[#a8a8a8]' : '',
                lowConfidence ? 'ring-2 ring-amber-300/80' : '',
              )}
              style={
                details === undefined
                  ? undefined
                  : { backgroundColor: details.background, color: details.foreground }
              }
              type="button"
              aria-label={`Sticker ${index + 1}${details === undefined ? '' : ` ${details.label}`}`}
              aria-pressed={selected}
              data-testid={`scan-sticker-${index}`}
              key={index}
              onClick={() => onSelect(index)}
            >
              {details?.label.slice(0, 1) ?? '?'}
              {lowConfidence ? (
                <span className="absolute right-1 top-1 text-[0.65rem] leading-none">?</span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
