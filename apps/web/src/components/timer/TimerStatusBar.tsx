import { useTranslation } from 'react-i18next'
import type { TimerDisplayStatus } from './TimerDisplay'

type TimerStatusBarProps = {
  status: TimerDisplayStatus
}

export function TimerStatusBar({ status }: TimerStatusBarProps) {
  const { t } = useTranslation()

  return (
    <div className="grid gap-1 border-x border-b border-[#2b2b2b] bg-[#101010] px-4 py-3 text-center">
      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#a8a8a8]">
        {t(`timer.status.${status}`)}
      </p>
      <p className="text-xs text-[#a8a8a8]">{t('timer.instructions.space')}</p>
    </div>
  )
}
