import { useTranslation } from 'react-i18next'
import { Panel } from '@components/layout/Panel'
import { Switch } from '@components/Switch'
import { useTimerSettingsStore } from '../../timerSettingsStore'

export function TimerSettingsPanel() {
  const { t } = useTranslation()
  const inspectionEnabled = useTimerSettingsStore((state) => state.inspectionEnabled)
  const setInspectionEnabled = useTimerSettingsStore((state) => state.setInspectionEnabled)
  const setShowMilliseconds = useTimerSettingsStore((state) => state.setShowMilliseconds)
  const showMilliseconds = useTimerSettingsStore((state) => state.showMilliseconds)

  return (
    <Panel className="grid min-h-0 grid-cols-2 gap-2 p-2 sm:w-fit sm:justify-self-start" aria-label={t('timer.settings.label')}>
      <label className="flex min-h-9 items-center gap-2 border border-app-border bg-app-control px-3 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-app-text">
        <Switch
          aria-label={t('timer.settings.inspection')}
          checked={inspectionEnabled}
          onCheckedChange={setInspectionEnabled}
        />
        {t('timer.settings.inspection')}
      </label>
      <label className="flex min-h-9 items-center gap-2 border border-app-border bg-app-control px-3 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-app-text">
        <Switch
          aria-label={t('timer.settings.milliseconds')}
          checked={showMilliseconds}
          onCheckedChange={setShowMilliseconds}
        />
        {t('timer.settings.milliseconds')}
      </label>
    </Panel>
  )
}
