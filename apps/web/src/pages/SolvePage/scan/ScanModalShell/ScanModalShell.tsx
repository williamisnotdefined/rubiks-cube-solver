import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@components/Button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@components/Dialog'
import { ScanExitConfirmationModal } from '../ScanExitConfirmationModal'
import { scanTileDetectorStatusMessage } from '../scanSessionMessages'

type ScanModalShellProps = {
  children: ReactNode
  visionOk?: boolean
  visionTileDetectorAvailable?: boolean
  visionTileDetectorReason?: string
  hasProgress: boolean
  onClose: () => void
}

export function ScanModalShell({
  children,
  visionOk,
  visionTileDetectorAvailable,
  visionTileDetectorReason,
  hasProgress,
  onClose,
}: ScanModalShellProps) {
  const { t } = useTranslation()
  const [exitConfirmationVisible, setExitConfirmationVisible] = useState(false)

  function requestClose() {
    if (hasProgress) {
      setExitConfirmationVisible(true)
      return
    }

    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => {
      if (!open) {
        requestClose()
      }
    }}>
      <DialogContent
        className="left-1/2 top-1/2 max-h-[calc(100vh-3rem)] w-[calc(100vw-1.5rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-auto border border-app-border bg-app-surface p-4 text-left text-app-text shadow-2xl sm:w-[calc(100vw-3rem)] sm:p-6"
        overlayClassName="bg-app-bg/90"
        overlayLabel={t('scan.modal.dismiss')}
        onEscapeKeyDown={(event) => {
          if (exitConfirmationVisible) {
            event.preventDefault()
          }
        }}
        onInteractOutside={(event) => {
          if (exitConfirmationVisible) {
            event.preventDefault()
          }
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-1">
            <DialogTitle asChild>
              <h2 className="text-lg font-extrabold uppercase tracking-[0.16em]">
                {t('scan.modal.title')}
              </h2>
            </DialogTitle>
            <DialogDescription asChild>
              <p className="text-sm font-semibold text-app-muted">
                {t('scan.modal.description')}
              </p>
            </DialogDescription>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-app-muted">
              {scanTileDetectorStatusMessage(
                t,
                visionOk,
                visionTileDetectorAvailable,
                visionTileDetectorReason,
              )}
            </p>
          </div>
          <Button size="sm" type="button" variant="secondary" onClick={requestClose}>
            {t('common.close')}
          </Button>
        </div>

        {children}
        {exitConfirmationVisible ? (
          <ScanExitConfirmationModal
            onCancel={() => setExitConfirmationVisible(false)}
            onConfirm={onClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
