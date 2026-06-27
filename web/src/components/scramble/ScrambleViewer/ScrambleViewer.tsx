import cls from 'classnames'
import { ChevronLeft, ChevronRight, Copy } from 'lucide-react'
import type { MouseEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

type ScrambleViewerProps = {
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
  const hasActions = onCopy !== undefined
    || onNext !== undefined
    || onPrevious !== undefined

  return (
    <section className={cls('grid min-h-0 gap-2 border border-app-border bg-app-surface px-3 py-2 text-center', className)}>
      <div className="grid min-h-8 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <span aria-hidden="true" />
        <div className="min-w-0 justify-self-center text-xs font-extrabold uppercase tracking-[0.18em] text-app-muted">
          {eventControl ?? <span>{eventLabel}</span>}
        </div>
        {hasActions ? (
          <div className="flex justify-self-end border border-app-border bg-app-control">
            <button
              aria-label={t('timer.scramble.previous')}
              className={scrambleActionButtonClassName}
              disabled={!canGoPrevious || onPrevious === undefined}
              type="button"
              onClick={(event) => handleActionClick(event, onPrevious)}
            >
              <ChevronLeft aria-hidden="true" size={18} strokeWidth={2.6} />
            </button>
            <button
              aria-label={t('timer.scramble.next')}
              className={scrambleActionButtonClassName}
              disabled={onNext === undefined}
              type="button"
              onClick={(event) => handleActionClick(event, onNext)}
            >
              <ChevronRight aria-hidden="true" size={18} strokeWidth={2.6} />
            </button>
            <button
              aria-label={copied ? t('timer.scramble.copied') : t('timer.scramble.copy')}
              className={cls(scrambleActionButtonClassName, {
                'border-app-border-strong bg-app-surface-raised text-app-text': copied,
              })}
              disabled={onCopy === undefined}
              type="button"
              onClick={(event) => handleActionClick(event, onCopy)}
            >
              <Copy aria-hidden="true" size={17} strokeWidth={2.6} />
            </button>
          </div>
        ) : (
          <span aria-hidden="true" />
        )}
      </div>
      <p className="mx-auto max-w-5xl whitespace-pre-wrap font-mono text-base font-black leading-relaxed tracking-[0.08em] text-app-text sm:text-lg">
        {scramble}
      </p>
    </section>
  )
}

const scrambleActionButtonClassName =
  'inline-flex min-h-8 min-w-8 items-center justify-center border-l border-app-border text-app-text outline-none transition-colors first:border-l-0 hover:bg-app-surface-raised focus-visible:ring-2 focus-visible:ring-app-focus/50 disabled:pointer-events-none disabled:opacity-40'

function handleActionClick(
  event: MouseEvent<HTMLButtonElement>,
  onClick: (() => void) | undefined,
) {
  event.currentTarget.blur()
  onClick?.()
}
