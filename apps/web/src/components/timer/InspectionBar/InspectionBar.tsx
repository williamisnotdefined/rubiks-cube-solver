import { useTranslation } from 'react-i18next'
import { formatTimerTime } from '@core/timer/formatTimerTime'
import type { TimerPenalty } from '@core/timer/penalties'

type InspectionBarProps = {
  enabled: boolean
  penalty: TimerPenalty
  remainingMs: number
}

export function InspectionBar({
  enabled,
  penalty,
  remainingMs,
}: InspectionBarProps) {
  const { t } = useTranslation()

  if (!enabled) {
    return null
  }

  return (
    <div className="grid gap-2 rounded-xl border bg-card p-4 text-center shadow-sm sm:grid-cols-3 sm:items-center sm:text-left">
      <p className="text-sm font-medium text-muted-foreground">
        {t('timer.inspection.title')}
      </p>
      <p className="font-mono text-3xl font-bold text-foreground sm:text-center">
        {formatTimerTime(remainingMs)}
      </p>
      {penalty !== 'ok' && (
        <p className="text-sm font-medium text-muted-foreground sm:text-right">
          {t(`timer.penalty.${penalty}`)}
        </p>
      )}
    </div>
  )
}
