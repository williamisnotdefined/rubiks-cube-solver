import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@components/Button'

type ScanExitConfirmationModalProps = {
  onCancel: () => void
  onConfirm: () => void
}

export function ScanExitConfirmationModal({
  onCancel,
  onConfirm,
}: ScanExitConfirmationModalProps) {
  const { t } = useTranslation()
  const titleId = useId()

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-3 py-6 sm:px-6">
      <button
        aria-label={t('scan.modal.cancelExit')}
        className="absolute inset-0 bg-app-bg/85"
        type="button"
        onClick={onCancel}
      />
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="relative grid w-full max-w-lg gap-5 border border-app-border-strong bg-app-surface p-4 text-left text-app-text shadow-2xl sm:p-6"
        role="dialog"
      >
        <div className="grid gap-2">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-app-muted">
            {t('scan.modal.exitKicker')}
          </p>
          <h2 className="text-lg font-extrabold uppercase tracking-[0.16em]" id={titleId}>
            {t('scan.modal.exitTitle')}
          </h2>
          <p className="text-sm font-semibold leading-relaxed text-app-muted">
            {t('scan.modal.exitDescription')}
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button className="min-h-10 px-4 py-2" type="button" variant="secondary" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button className="min-h-10 px-4 py-2" type="button" onClick={onConfirm}>
            {t('scan.modal.exitAction')}
          </Button>
        </div>
      </section>
    </div>
  )
}
