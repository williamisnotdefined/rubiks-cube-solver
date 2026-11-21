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
    <section
      className={cls(
        'grid w-full border-2 border-foreground bg-card text-card-foreground shadow-[4px_4px_0_var(--foreground)]',
        className,
      )}
    >
      <div className='grid grid-cols-4'>
        {cards.map((card, index) => (
          <article
            key={card.label}
            className={cls('min-h-20 p-3', {
              'border-r-2 border-foreground': index < cards.length - 1,
            })}
          >
            <p className='label-mono text-muted-foreground'>{t(`timer.stats.${card.label}`)}</p>
            <p className='mt-1 font-mono text-xl font-black tabular-nums'>
              {formatTimerTime(card.timeMs, { showMilliseconds })}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
