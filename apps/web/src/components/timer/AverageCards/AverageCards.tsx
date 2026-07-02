import cls from 'classnames'
import { useTranslation } from 'react-i18next'
import { formatTimerTime } from '@core/timer/formatTimerTime'

export type AverageCardValue = {
  label: string
  timeMs: number | null
}

type AverageCardsProps = {
  cards: readonly AverageCardValue[]
  className?: string
  showMilliseconds?: boolean
}

export function AverageCards({ cards, className, showMilliseconds = false }: AverageCardsProps) {
  const { t } = useTranslation()

  return (
    <section className={cls('grid w-full border border-app-border bg-app-surface p-2', className)}>
      <div className="grid grid-cols-4">
        {cards.map((card, index) => (
          <article
            key={card.label}
            className={cls('min-h-20 p-3', {
              'border-r border-app-border': index < cards.length - 1,
            })}
          >
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-app-muted">
              {t(`timer.stats.${card.label}`)}
            </p>
            <p className="mt-1 font-mono text-xl font-black text-app-text">
              {formatTimerTime(card.timeMs, { showMilliseconds })}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
