import type { Ref } from 'react'
import { useTranslation } from 'react-i18next'
import type { AnalyzeScanFaceResponse } from '@api/scan'
import type { ScanFaceSymbol } from '@api/solver/types'
import { Button } from '@components/Button'
import { Loader3x3 } from '@components/Loader3x3'
import { Tooltip } from '@components/Tooltip'
import type { LiveScanPreviewStatus } from '../hooks/useLiveScanPreview'
import { ScanCameraFrame } from '../ScanCameraFrame'
import { ScanFaceCarousel } from '../ScanFaceCarousel'
import { ScanFaceColorEditor } from '../ScanFaceColorEditor'
import {
  confirmedDraftCount,
  scanFaceOrder,
  scanSymbolDetails,
  scanSymbols,
  type ScanFaceDraft,
  type ScanFaceDrafts,
  type ScanFaceStatus,
} from '../scanState'
import {
  scanColorLabel,
  scanFaceInstruction,
  scanFaceLabel,
  scanFaceTopLabel,
} from '../scanTranslations'
import type { TemporalFaceConsensus } from '../scanTemporalConsensus'

type ScanCameraStatus = 'idle' | 'loading' | 'ready' | 'error'

type ScanFaceCaptureStepProps = {
  autoScanEnabled: boolean
  cameraAnalysis?: AnalyzeScanFaceResponse
  cameraMessage?: string
  cameraStatus: ScanCameraStatus
  cameraTemporalConsensus?: TemporalFaceConsensus
  canClearPhoto: boolean
  capturing: boolean
  currentDraft: ScanFaceDraft
  currentFace: { symbol: ScanFaceSymbol }
  currentFaceIndex: number
  drafts: ScanFaceDrafts
  faceValidation?: string
  faceStatuses: ScanFaceStatus[]
  finalActionDisabled: boolean
  finalActionDisabledReason?: string
  finalActionLabel: string
  finalActionLoading: boolean
  liveStableFrameCount: number
  liveStatus: LiveScanPreviewStatus
  message?: string
  messageFallback?: string
  previewCounts: Record<ScanFaceSymbol, number>
  reviewTargetIndexes: number[]
  scannerMessage: string
  showExpectedCenter: boolean
  stickersPerFace: number
  videoRef: Ref<HTMLVideoElement>
  onAutoScanToggle: () => void
  onCapture: () => void
  onClear: () => void
  onConfirmFace: () => void
  onFaceIndexChange: (index: number) => void
  onFinalAction: () => void
  onStickerColorChange: (index: number, symbol: ScanFaceSymbol) => void
}

export function ScanFaceCaptureStep({
  autoScanEnabled,
  cameraAnalysis,
  cameraMessage,
  cameraStatus,
  cameraTemporalConsensus,
  canClearPhoto,
  capturing,
  currentDraft,
  currentFace,
  currentFaceIndex,
  drafts,
  faceValidation,
  faceStatuses,
  finalActionDisabled,
  finalActionDisabledReason,
  finalActionLabel,
  finalActionLoading,
  liveStableFrameCount,
  liveStatus,
  message,
  messageFallback,
  previewCounts,
  reviewTargetIndexes,
  scannerMessage,
  showExpectedCenter,
  stickersPerFace,
  videoRef,
  onAutoScanToggle,
  onCapture,
  onClear,
  onConfirmFace,
  onFaceIndexChange,
  onFinalAction,
  onStickerColorChange,
}: ScanFaceCaptureStepProps) {
  const { t } = useTranslation()

  return (
    <ScanFaceCarousel
      currentFaceIndex={currentFaceIndex}
      faceStatuses={faceStatuses}
      stickersPerFace={stickersPerFace}
      onFaceIndexChange={onFaceIndexChange}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <div className="grid gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-app-muted">
                {t('scan.modal.faceProgress', {
                  current: currentFaceIndex + 1,
                  total: scanFaceOrder.length,
                })}
              </p>
              <h3 className="mt-1 text-xl font-extrabold">
                {scanFaceLabel(t, currentFace.symbol, stickersPerFace)}
              </h3>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-app-muted">
                {scanFaceInstruction(t, currentFace.symbol, stickersPerFace)}
              </p>
              {showExpectedCenter ? (
                <p className="mt-1 text-xs font-extrabold uppercase tracking-[0.16em] text-app-text">
                  {t('scan.modal.expectedCenter', {
                    color: scanColorLabel(t, currentFace.symbol),
                  })}
                </p>
              ) : null}
              <p className="mt-1 text-xs font-extrabold uppercase tracking-[0.16em] text-app-text">
                {t('scan.modal.keepAtTop', {
                  color: scanFaceTopLabel(t, currentFace.symbol, stickersPerFace),
                })}
              </p>
            </div>
            <span className="border border-app-border bg-app-surface-raised px-3 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-app-muted">
              {t('scan.modal.confirmed', { count: confirmedDraftCount(drafts) })}
            </span>
          </div>

          <ScanCameraFrame
            cameraMessage={cameraMessage}
            cameraStatus={cameraStatus}
            detectionMode={cameraAnalysis?.detectionMode}
            stableFrameCount={liveStableFrameCount}
            targetStickerCount={stickersPerFace}
            temporalConsensus={cameraTemporalConsensus}
            tileDetections={cameraAnalysis?.tileDetections}
            trackingStatus={liveStatus}
            videoRef={videoRef}
          />

          <div className="flex flex-wrap gap-2">
            <Button
              aria-pressed={autoScanEnabled}
              size="sm"
              disabled={capturing || cameraStatus !== 'ready'}
              type="button"
              variant="ghost"
              onClick={onAutoScanToggle}
            >
              {autoScanEnabled ? t('scan.actions.autoScanOn') : t('scan.actions.autoScanOff')}
            </Button>
            <Button
              size="sm"
              disabled={cameraStatus !== 'ready' || capturing}
              type="button"
              variant="secondary"
              onClick={onCapture}
            >
              {capturing
                ? t('scan.actions.analyzing')
                : currentDraft.photoDataUrl === undefined
                  ? t('scan.actions.takePhoto')
                  : t('scan.actions.retakePhoto')}
            </Button>
            <Button
              size="sm"
              disabled={!canClearPhoto || capturing}
              type="button"
              variant="ghost"
              onClick={onClear}
            >
              {t('scan.actions.clearPhoto')}
            </Button>
            <Button
              size="sm"
              disabled={faceValidation !== undefined}
              type="button"
              variant="secondary"
              onClick={onConfirmFace}
            >
              {currentDraft.confirmed ? t('scan.actions.updateFace') : t('scan.actions.confirmFace')}
            </Button>
          </div>
        </div>

        <div className="grid content-start gap-4">
          <ScanFaceColorEditor
            centerSymbol={currentFace.symbol}
            key={currentFace.symbol}
            reviewTargetIndexes={reviewTargetIndexes}
            stickers={currentDraft.stickers}
            stickersPerFace={stickersPerFace}
            onStickerColorChange={onStickerColorChange}
          />
          <div className="grid gap-2 border border-app-border bg-app-surface-raised p-3 text-sm font-semibold text-app-muted">
            <span className="text-xs font-extrabold uppercase tracking-[0.16em]">{t('scan.editor.colorCount')}</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {scanSymbols.map((symbol) => {
                const details = scanSymbolDetails[symbol]

                return (
                  <span className="flex items-center gap-2" key={symbol}>
                    <span
                      className="size-3 border border-app-border"
                      style={{ backgroundColor: details.background }}
                    />
                    {scanColorLabel(t, symbol)}: {previewCounts[symbol]}/{stickersPerFace}
                  </span>
                )
              })}
            </div>
          </div>
          <p className="min-h-10 text-sm font-semibold leading-relaxed text-app-muted" aria-live="polite">
            {message ?? messageFallback ?? scannerMessage}
          </p>
          <Tooltip content={finalActionDisabledReason}>
            <span className="inline-flex" tabIndex={finalActionDisabledReason === undefined ? undefined : 0}>
              <Button
                aria-label={finalActionLoading ? t('common.loading') : undefined}
                className="w-full"
                disabled={finalActionDisabled}
                type="button"
                onClick={onFinalAction}
              >
                {finalActionLoading ? (
                  <Loader3x3 decorative className="size-8" registerDelayMs={150} />
                ) : (
                  finalActionLabel
                )}
              </Button>
            </span>
          </Tooltip>
        </div>
      </div>
    </ScanFaceCarousel>
  )
}
