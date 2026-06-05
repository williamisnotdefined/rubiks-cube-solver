import cls from 'classnames'
import useEmblaCarousel from 'embla-carousel-react'
import { useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@components/Button'
import {
  scan2StickersPerFace,
  scanFaceOrder,
  scanSymbolDetails,
  type ScanFaceStatus,
} from './scanState'
import { scanColorCode } from './scanColorSymbols'
import { scanFaceLabel } from './scanTranslations'

type ScanFaceCarouselProps = {
  children: ReactNode
  currentFaceIndex: number
  faceStatuses: readonly ScanFaceStatus[]
  stickersPerFace?: number
  onFaceIndexChange: (index: number) => void
}

const statusClassNames: Record<ScanFaceStatus, string> = {
  confirmed: 'border-app-success/80 text-app-success',
  draft: 'border-app-info/80 text-app-info',
  invalid: 'border-app-danger/80 text-app-danger',
  needsReview: 'border-app-warning/80 text-app-warning',
  pending: 'border-app-border text-app-muted',
}

export function ScanFaceCarousel({
  children,
  currentFaceIndex,
  faceStatuses,
  stickersPerFace,
  onFaceIndexChange,
}: ScanFaceCarouselProps) {
  const { t } = useTranslation()
  const [emblaRef, emblaApi] = useEmblaCarousel({
    containScroll: 'trimSnaps',
    dragFree: false,
    loop: false,
  })
  const canGoPrevious = currentFaceIndex > 0
  const canGoNext = currentFaceIndex < scanFaceOrder.length - 1

  useEffect(() => {
    emblaApi?.scrollTo(currentFaceIndex)
  }, [currentFaceIndex, emblaApi])

  useEffect(() => {
    if (emblaApi === undefined) {
      return
    }

    function handleSelect() {
      const selectedIndex = emblaApi?.selectedScrollSnap()
      if (selectedIndex !== undefined && selectedIndex !== currentFaceIndex) {
        onFaceIndexChange(selectedIndex)
      }
    }

    emblaApi.on('select', handleSelect)

    return () => {
      emblaApi.off('select', handleSelect)
    }
  }, [currentFaceIndex, emblaApi, onFaceIndexChange])

  return (
    <div className="mt-5 grid gap-4">
      <div className="grid gap-3 border border-app-border bg-app-surface-raised p-3">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {scanFaceOrder.map(({ symbol }, index) => {
            const active = index === currentFaceIndex
            const status = faceStatuses[index] ?? 'pending'
            const details = scanSymbolDetails[symbol]
            const label = scanFaceLabel(t, symbol, stickersPerFace)
            const statusLabel = scanFaceStatusLabel(t, status)
            const usePositionalLabel = stickersPerFace === scan2StickersPerFace

            return (
              <button
                aria-current={active ? 'step' : undefined}
                aria-label={t('scan.carousel.goToFace', { face: label, status: statusLabel })}
                className={cls(
                  'grid min-h-14 gap-1 border bg-app-surface px-2 py-2 text-center text-xs font-extrabold uppercase tracking-[0.14em] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-app-focus/50',
                  active ? 'border-app-text text-app-text' : statusClassNames[status],
                )}
                key={symbol}
                type="button"
                onClick={() => onFaceIndexChange(index)}
              >
                <span className="flex items-center justify-center gap-2">
                  {usePositionalLabel ? null : (
                    <span
                      className="size-3 border border-app-border"
                      style={{ backgroundColor: details.background }}
                    />
                  )}
                  {usePositionalLabel ? label : scanColorCode(symbol)}
                </span>
                <span className="truncate text-[0.62rem] tracking-[0.12em]">{statusLabel}</span>
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap justify-between gap-2">
          <Button
            className="min-h-10 px-4 py-2"
            disabled={!canGoPrevious}
            type="button"
            variant="ghost"
            onClick={() => onFaceIndexChange(currentFaceIndex - 1)}
          >
            {t('scan.carousel.previous')}
          </Button>
          <Button
            className="min-h-10 px-4 py-2"
            disabled={!canGoNext}
            type="button"
            variant="ghost"
            onClick={() => onFaceIndexChange(currentFaceIndex + 1)}
          >
            {t('scan.carousel.next')}
          </Button>
        </div>
      </div>

      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex touch-pan-y">
          {scanFaceOrder.map(({ symbol }, index) => (
            <div
              aria-hidden={index === currentFaceIndex ? undefined : true}
              className="min-w-0 flex-[0_0_100%]"
              key={symbol}
            >
              {index === currentFaceIndex ? (
                children
              ) : (
                <div className="grid min-h-80 place-items-center border border-app-border bg-app-surface p-6 text-center text-sm font-semibold text-app-muted">
                  {scanFaceLabel(t, symbol, stickersPerFace)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function scanFaceStatusLabel(t: ReturnType<typeof useTranslation>['t'], status: ScanFaceStatus): string {
  switch (status) {
    case 'confirmed':
      return t('scan.carousel.faceConfirmed')
    case 'draft':
      return t('scan.carousel.faceDraft')
    case 'invalid':
      return t('scan.carousel.faceInvalid')
    case 'needsReview':
      return t('scan.carousel.faceNeedsReview')
    case 'pending':
      return t('scan.carousel.facePending')
  }
}
