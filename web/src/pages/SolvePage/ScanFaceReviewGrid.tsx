import cls from 'classnames'
import { useTranslation } from 'react-i18next'
import type { ScanSticker } from './scanState'
import { isLowConfidenceScanSticker, scan2StickersPerFace, scanSymbolDetails } from './scanState'
import { scanColorInitial, scanColorLabel } from './scanTranslations'

type ScanFaceReviewGridProps = {
  reviewTargetIndexes?: readonly number[]
  stickersPerFace?: number
  stickers: readonly ScanSticker[]
  selectedIndex: number
  onSelect: (index: number) => void
}

export function ScanFaceReviewGrid({
  reviewTargetIndexes = [],
  stickersPerFace,
  stickers,
  selectedIndex,
  onSelect,
}: ScanFaceReviewGridProps) {
  const { t } = useTranslation()
  const reviewTargets = new Set(reviewTargetIndexes)

  return (
    <div className="grid gap-2" aria-label={t('scan.editor.reviewGroupLabel')} role="group">
      <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-app-muted">
        {t('scan.editor.reviewColors')}
      </span>
      <div className={cls(
        'grid aspect-square w-full max-w-[17rem] gap-2 justify-self-center',
        stickersPerFace === scan2StickersPerFace ? 'grid-cols-2' : 'grid-cols-3',
      )}>
        {stickers.map((sticker, index) => {
          const details = sticker.symbol === undefined ? undefined : scanSymbolDetails[sticker.symbol]
          const selected = selectedIndex === index
          const lowConfidence = isLowConfidenceScanSticker(sticker, index)
          const reviewTarget = reviewTargets.has(index)
          const alternative = sticker.alternatives?.find(
            (candidate) => candidate.symbol !== sticker.symbol,
          )
          const colorLabel = sticker.symbol === undefined ? undefined : scanColorLabel(t, sticker.symbol)
          const reviewLabel = stickerReviewLabel(t, index, colorLabel, lowConfidence, reviewTarget, alternative)

          return (
            <button
              className={cls(
                'relative min-h-16 border text-sm font-extrabold uppercase tracking-[0.14em] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-app-focus/50',
                selected ? 'border-app-text' : 'border-app-border',
                details === undefined ? 'bg-app-surface-raised text-app-muted' : '',
                lowConfidence ? 'ring-2 ring-app-warning/80' : '',
                reviewTarget ? 'ring-4 ring-app-info/90' : '',
              )}
              style={
                details === undefined
                  ? undefined
                  : { backgroundColor: details.background, color: details.foreground }
              }
              type="button"
              aria-label={reviewLabel}
              aria-pressed={selected}
              data-testid={`scan-sticker-${index}`}
              key={index}
              title={reviewLabel}
              onClick={() => onSelect(index)}
            >
              {sticker.symbol === undefined ? '?' : scanColorInitial(t, sticker.symbol)}
              {lowConfidence ? (
                <span className="absolute right-1 top-1 text-[0.65rem] leading-none">?</span>
              ) : null}
              {reviewTarget ? (
                <span className="absolute left-1 top-1 text-[0.65rem] leading-none">!</span>
              ) : null}
              {lowConfidence && alternative !== undefined ? (
                <span className="absolute bottom-1 left-1 right-1 truncate text-[0.55rem] normal-case tracking-normal">
                  {t('scan.editor.orAlternative', {
                    colorInitial: scanColorInitial(t, alternative.symbol),
                  })}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function stickerReviewLabel(
  t: ReturnType<typeof useTranslation>['t'],
  index: number,
  label: string | undefined,
  lowConfidence: boolean,
  reviewTarget: boolean,
  alternative: NonNullable<ScanSticker['alternatives']>[number] | undefined,
): string {
  const base = t('scan.editor.stickerLabel', {
    color: label === undefined ? '' : ` ${label}`,
    index: index + 1,
  })

  const targetLabel = reviewTarget ? `, ${t('scan.editor.needsConfirmation')}` : ''

  if (!lowConfidence) {
    return `${base}${targetLabel}`
  }

  if (alternative === undefined) {
    return `${base}${targetLabel}, ${t('scan.editor.uncertainColor')}`
  }

  const alternativeLabel = scanColorLabel(t, alternative.symbol)
  return `${base}${targetLabel}, ${t('scan.editor.uncertainColor')}, ${t('scan.editor.uncertainMaybe', { color: alternativeLabel })}`
}
