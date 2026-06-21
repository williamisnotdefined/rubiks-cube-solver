import { useTranslation } from 'react-i18next'
import { formatTimerTime } from '@core/timer/formatTimerTime'
import type { TimerPenalty } from '@core/timer/penalties'

type InspectionBarProps = {
  enabled: boolean
  penalty: TimerPenalty
  remainingMs: number
}

export function InspectionBar({ enabled, penalty, remainingMs }: InspectionBarProps) {
  const { t } = useTranslation()

  if (!enabled) {
    return null
  }

  return (
    <div className="grid gap-2 border border-app-border bg-app-surface p-4 text-center sm:grid-cols-3 sm:items-center sm:text-left">
      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-app-muted">
        {t('timer.inspection.title')}
      </p>
      <p className="font-mono text-3xl font-black text-app-text sm:text-center">
        {formatTimerTime(remainingMs)}
      </p>
      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-app-muted sm:text-right">
        {t(`timer.penalty.${penalty}`)}
      </p>
    </div>
  )
}
