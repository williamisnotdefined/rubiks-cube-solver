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
    <div className={cls('grid w-full gap-2 sm:grid-cols-4', className)}>
      {cards.map((card) => (
        <article key={card.label} className="border border-app-border bg-app-surface p-4">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-app-muted">
            {t(`timer.stats.${card.label}`)}
          </p>
          <p className="mt-2 font-mono text-2xl font-black text-app-text">
            {formatTimerTime(card.timeMs, { showMilliseconds })}
          </p>
        </article>
      ))}
    </div>
  )
}
