import cls from 'classnames'
import { ChevronLeft, ChevronRight, Copy } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

type ScrambleViewerProps = {
  actionSlot?: ReactNode
  canGoPrevious?: boolean
  className?: string
  copied?: boolean
  eventControl?: ReactNode
  eventLabel: string
  onCopy?: () => void
  onNext?: () => void
  onPrevious?: () => void
  scramble: string
}

export function ScrambleViewer({
  actionSlot,
  canGoPrevious = false,
  className,
  copied = false,
  eventControl,
  eventLabel,
  onCopy,
  onNext,
  onPrevious,
  scramble,
}: ScrambleViewerProps) {
  const { t } = useTranslation()
  const hasActions =
    onCopy !== undefined ||
    onNext !== undefined ||
    onPrevious !== undefined ||
    actionSlot !== undefined

  return (
    <section
      className={cls(
        'grid min-h-0 gap-3 border-2 border-foreground bg-card px-3 py-3 text-center text-card-foreground shadow-[4px_4px_0_var(--foreground)]',
        className,
      )}
    >
      <div className='flex min-h-8 flex-wrap items-center justify-between gap-2'>
        <div className='label-mono min-w-0 text-muted-foreground'>
          {eventControl ?? <span>{eventLabel}</span>}
        </div>
        {hasActions ? (
          <div className='flex overflow-hidden border-2 border-foreground bg-background'>
            <button
              aria-label={t('timer.scramble.previous')}
              className={scrambleActionButtonClassName}
              disabled={!canGoPrevious || onPrevious === undefined}
              type='button'
              onClick={onPrevious}
            >
              <ChevronLeft aria-hidden='true' size={18} strokeWidth={2.6} />
            </button>
            <button
              aria-label={t('timer.scramble.next')}
              className={scrambleActionButtonClassName}
              disabled={onNext === undefined}
              type='button'
              onClick={onNext}
            >
              <ChevronRight aria-hidden='true' size={18} strokeWidth={2.6} />
            </button>
            <button
              aria-label={copied ? t('timer.scramble.copied') : t('timer.scramble.copy')}
              className={cls(scrambleActionButtonClassName, {
                'bg-accent text-accent-foreground': copied,
              })}
              disabled={onCopy === undefined}
              type='button'
              onClick={onCopy}
            >
              <Copy aria-hidden='true' size={17} strokeWidth={2.6} />
            </button>
            {actionSlot}
          </div>
        ) : null}
      </div>
      <p className='mx-auto max-w-5xl whitespace-pre-wrap font-mono text-base font-semibold leading-relaxed tracking-[0.04em] sm:text-lg'>
        {scramble}
      </p>
    </section>
  )
}

const scrambleActionButtonClassName =
  'inline-flex min-h-8 min-w-8 items-center justify-center border-l text-foreground outline-none transition-colors first:border-l-0 hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40'
