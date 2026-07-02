import { Settings, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from '@components/Dialog'
import { Switch } from '@components/Switch'
import { useTimerSettingsStore } from '../../timerSettingsStore'

export function TimerSettingsPanel() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const inspectionEnabled = useTimerSettingsStore((state) => state.inspectionEnabled)
  const setInspectionEnabled = useTimerSettingsStore((state) => state.setInspectionEnabled)
  const setShowMilliseconds = useTimerSettingsStore((state) => state.setShowMilliseconds)
  const showMilliseconds = useTimerSettingsStore((state) => state.showMilliseconds)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          aria-label={t('timer.settings.label')}
          className="inline-flex min-h-8 min-w-8 items-center justify-center border-l border-app-border text-app-text outline-none transition-colors hover:bg-app-surface-raised focus-visible:ring-2 focus-visible:ring-app-focus/50"
          type="button"
        >
          <Settings aria-hidden="true" className="size-[17px]" strokeWidth={2.6} />
        </button>
      </DialogTrigger>
      <DialogContent
        aria-describedby={undefined}
        className="left-1/2 top-1/2 w-[calc(100vw-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 border border-app-border bg-app-surface p-4 text-left text-app-text shadow-2xl sm:w-[calc(100vw-3rem)] sm:p-5"
        overlayClassName="bg-app-bg/85 backdrop-blur-sm"
        overlayLabel={t('common.close')}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <div className="flex items-center justify-between gap-4">
          <DialogTitle asChild>
            <h2 className="text-sm font-black uppercase tracking-[0.18em] text-app-text">
              {t('timer.settings.label')}
            </h2>
          </DialogTitle>
          <DialogClose asChild>
            <button
              aria-label={t('common.close')}
              className="inline-flex min-h-8 min-w-8 items-center justify-center border border-app-border bg-app-control text-app-text outline-none transition-colors hover:border-app-text hover:bg-app-surface-raised focus-visible:ring-2 focus-visible:ring-app-focus/50"
              type="button"
            >
              <X aria-hidden="true" className="size-4" strokeWidth={2.6} />
            </button>
          </DialogClose>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <div className="flex min-h-10 items-center gap-2 border border-app-border bg-app-control px-3 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-app-text">
            <Switch
              aria-label={t('timer.settings.inspection')}
              checked={inspectionEnabled}
              onCheckedChange={setInspectionEnabled}
            />
            {t('timer.settings.inspection')}
          </div>
          <div className="flex min-h-10 items-center gap-2 border border-app-border bg-app-control px-3 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-app-text">
            <Switch
              aria-label={t('timer.settings.milliseconds')}
              checked={showMilliseconds}
              onCheckedChange={setShowMilliseconds}
            />
            {t('timer.settings.milliseconds')}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
