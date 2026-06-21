import { useTranslation } from 'react-i18next'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@components/AlertDialog'
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

  return (
    <AlertDialog open onOpenChange={(open) => {
      if (!open) {
        onCancel()
      }
    }}>
      <AlertDialogContent
        className="left-1/2 top-1/2 z-[80] grid w-[calc(100vw-1.5rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-5 border border-app-border-strong bg-app-surface p-4 text-left text-app-text shadow-2xl sm:w-[calc(100vw-3rem)] sm:p-6"
        overlayClassName="z-[80] bg-app-bg/85"
        overlayLabel={t('scan.modal.cancelExit')}
        onOverlayClick={onCancel}
      >
        <div className="grid gap-2">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-app-muted">
            {t('scan.modal.exitKicker')}
          </p>
          <AlertDialogTitle asChild>
            <h2 className="text-lg font-extrabold uppercase tracking-[0.16em]">
              {t('scan.modal.exitTitle')}
            </h2>
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <p className="text-sm font-semibold leading-relaxed text-app-muted">
              {t('scan.modal.exitDescription')}
            </p>
          </AlertDialogDescription>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <AlertDialogCancel asChild>
            <Button size="sm" type="button" variant="secondary" onClick={(event) => {
              event.preventDefault()
              onCancel()
            }}>
              {t('common.cancel')}
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button size="sm" type="button" onClick={(event) => {
              event.preventDefault()
              onConfirm()
            }}>
              {t('scan.modal.exitAction')}
            </Button>
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
