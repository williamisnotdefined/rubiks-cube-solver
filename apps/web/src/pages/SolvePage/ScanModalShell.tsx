import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@components/Button'
import { scanCnnStatusMessage, scanTileDetectorStatusMessage } from './scanSessionMessages'

type ScanModalShellProps = {
  children: ReactNode
  titleId: string
  visionOk?: boolean
  visionCnnAvailable?: boolean
  visionCnnReason?: string
  visionTileDetectorAvailable?: boolean
  visionTileDetectorReason?: string
  onClose: () => void
  onOverlayClose?: () => void
}

export function ScanModalShell({
  children,
  titleId,
  visionOk,
  visionCnnAvailable,
  visionCnnReason,
  visionTileDetectorAvailable,
  visionTileDetectorReason,
  onClose,
  onOverlayClose,
}: ScanModalShellProps) {
  const { t } = useTranslation()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-3 py-6 sm:px-6">
      <button
        aria-label={t('scan.modal.dismiss')}
        className="absolute inset-0 bg-app-bg/90"
        type="button"
        onClick={onOverlayClose ?? onClose}
      />
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="relative max-h-[calc(100vh-3rem)] w-full max-w-4xl overflow-auto border border-app-border bg-app-surface p-4 text-left text-app-text shadow-2xl sm:p-6"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-1">
            <h2 className="text-lg font-extrabold uppercase tracking-[0.16em]" id={titleId}>
              {t('scan.modal.title')}
            </h2>
            <p className="text-sm font-semibold text-app-muted">
              {t('scan.modal.description')}
            </p>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-app-muted">
              {scanCnnStatusMessage(t, visionOk, visionCnnAvailable, visionCnnReason)}
            </p>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-app-muted">
              {scanTileDetectorStatusMessage(
                t,
                visionOk,
                visionTileDetectorAvailable,
                visionTileDetectorReason,
              )}
            </p>
          </div>
          <Button className="min-h-10 px-4 py-2" type="button" variant="secondary" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>

        {children}
      </section>
    </div>
  )
}
