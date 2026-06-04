import { useTranslation } from 'react-i18next'
import { formatTimerTime } from '@core/timer/formatTimerTime'

export type AverageCardValue = {
  label: string
  timeMs: number | null
}

type AverageCardsProps = {
  cards: readonly AverageCardValue[]
  showMilliseconds?: boolean
}

export function AverageCards({ cards, showMilliseconds = false }: AverageCardsProps) {
  const { t } = useTranslation()

  return (
    <div className="grid w-full gap-2 sm:grid-cols-4">
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
