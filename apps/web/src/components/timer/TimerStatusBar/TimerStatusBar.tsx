import { useTranslation } from 'react-i18next'
import type { TimerDisplayStatus } from '../TimerDisplay'

type TimerStatusBarProps = {
  status: TimerDisplayStatus
}

export function TimerStatusBar({ status }: TimerStatusBarProps) {
  const { t } = useTranslation()

  return (
    <div className='grid gap-1 rounded-xl border bg-card px-4 py-3 text-center shadow-sm'>
      <p className='text-sm font-medium text-muted-foreground'>{t(`timer.status.${status}`)}</p>
      <p className='text-xs text-muted-foreground'>{t('timer.instructions.space')}</p>
    </div>
  )
}
