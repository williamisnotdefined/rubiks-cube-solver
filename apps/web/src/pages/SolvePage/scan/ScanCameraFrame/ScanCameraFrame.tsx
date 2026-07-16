import { memo, type Ref } from 'react'
import { useTranslation } from 'react-i18next'
import type { ScanDetectionBox, ScanTileDetection } from '@api/scan'
import type { ScanFaceSymbol } from '@api/solver/types'
import type { LiveScanPreviewStatus } from '../hooks/useLiveScanPreview'
import { scanColorCode } from '../scanColorSymbols'
import type { TemporalFaceConsensus } from '../scanTemporalConsensus'
import { scanSymbolDetails } from '../scanState'
import { validStickerTileDetections } from '../scanTileDetections'

type ScanCameraStatus = 'idle' | 'loading' | 'ready' | 'error'

type OverlayStickerBox = {
  bbox: ScanDetectionBox
  confidence: number
  key: string
  symbol: ScanFaceSymbol
}

type ScanCameraFrameProps = {
  cameraMessage?: string
  cameraStatus: ScanCameraStatus
  detectionMode?: string | null
  stableFrameCount?: number
  targetStickerCount?: number
  temporalConsensus?: TemporalFaceConsensus
  tileDetections?: readonly ScanTileDetection[]
  trackingStatus?: LiveScanPreviewStatus
  videoRef: Ref<HTMLVideoElement>
}

export const ScanCameraFrame = memo(function ScanCameraFrame({
  cameraMessage,
  cameraStatus,
  detectionMode,
  stableFrameCount = 0,
  targetStickerCount = 9,
  temporalConsensus,
  tileDetections = [],
  trackingStatus = 'idle',
  videoRef,
}: ScanCameraFrameProps) {
  const { t } = useTranslation()
  const stickerBoxes = stickerOverlayBoxes(tileDetections)
  const statusLabel = cameraStatusLabel({
    detectionMode,
    stableFrameCount,
    stickerCount: stickerBoxes.length,
    targetStickerCount,
    t,
    trackingStatus,
  })
  const temporalStatusLabel = temporalConsensusLabel(temporalConsensus, t)
  const tileConfidence = average(stickerBoxes.map((box) => box.confidence))

  return (
    <div className='relative aspect-square w-full max-w-[32rem] justify-self-center overflow-hidden border border-app-border bg-app-bg'>
      <video className='block size-full object-cover' muted playsInline ref={videoRef} />
      {stickerBoxes.length > 0 ? (
        <div className='pointer-events-none absolute inset-0'>
          {stickerBoxes.map((detection) => (
            <div
              key={detection.key}
              className='absolute border font-extrabold text-app-text'
              style={{
                backgroundColor: `color-mix(in srgb, ${scanBoxFill(detection.symbol)} 10%, transparent)`,
                borderColor: `color-mix(in srgb, ${scanBoxStroke(detection.symbol)} ${trackingStatus === 'holding_steady' ? 95 : 72}%, transparent)`,
                borderWidth: trackingStatus === 'holding_steady' ? '2px' : '1px',
                height: `${detection.bbox.height * 100}%`,
                left: `${(detection.bbox.x - detection.bbox.width / 2) * 100}%`,
                top: `${(detection.bbox.y - detection.bbox.height / 2) * 100}%`,
                width: `${detection.bbox.width * 100}%`,
              }}
            >
              <span className='absolute left-1 top-1 bg-app-bg/70 px-1 text-[0.65rem] leading-none'>
                {scanBoxLabel(detection.symbol)} {Math.round(detection.confidence * 100)}
              </span>
            </div>
          ))}
        </div>
      ) : null}
      {statusLabel === undefined ? null : (
        <div className='absolute left-2 top-2 border border-app-border bg-app-bg/80 px-2 py-1 text-[0.65rem] font-extrabold uppercase tracking-[0.12em] text-app-text'>
          {statusLabel}
        </div>
      )}
      {temporalStatusLabel === undefined ? null : (
        <div className='absolute right-2 top-2 border border-app-border bg-app-bg/80 px-2 py-1 text-[0.65rem] font-extrabold uppercase tracking-[0.12em] text-app-text'>
          {temporalStatusLabel}
        </div>
      )}
      {tileConfidence <= 0 ? null : (
        <div className='absolute bottom-2 left-2 border border-app-border bg-app-bg/80 px-2 py-1 text-[0.65rem] font-extrabold uppercase tracking-[0.12em] text-app-text'>
          {t('scan.camera.stickerConfidence', { confidence: Math.round(tileConfidence * 100) })}
        </div>
      )}
      {cameraStatus === 'loading' ? (
        <div className='absolute inset-0 grid place-items-center bg-app-bg/70 text-sm font-extrabold uppercase tracking-[0.16em] text-app-text'>
          {t('scan.camera.opening')}
        </div>
      ) : null}
      {cameraStatus === 'error' ? (
        <div className='absolute inset-0 grid place-items-center bg-app-bg/85 p-4 text-center text-sm font-semibold leading-relaxed text-app-text'>
          {t('scan.camera.errorManualFallback', { message: cameraMessage })}
        </div>
      ) : null}
    </div>
  )
})

function temporalConsensusLabel(
  consensus: TemporalFaceConsensus | undefined,
  t: ReturnType<typeof useTranslation>['t'],
): string | undefined {
  if (consensus === undefined || consensus.framesSeen === 0) {
    return undefined
  }

  if (consensus.status === 'ready') {
    return t('scan.camera.temporalReady', {
      agreement: Math.round(consensus.temporalAgreement * 100),
      count: consensus.framesUsed,
    })
  }

  if (consensus.status === 'unstable') {
    return t('scan.camera.temporalUnstable', { count: consensus.framesUsed })
  }

  if (consensus.status === 'color_disagreement') {
    return t('scan.camera.temporalColorDisagreement', { count: consensus.framesUsed })
  }

  return t('scan.camera.temporalCollecting', {
    count: consensus.framesUsed,
    target: 6,
  })
}

function stickerOverlayBoxes(tileDetections: readonly ScanTileDetection[]): OverlayStickerBox[] {
  return validStickerTileDetections(tileDetections).map((detection, index) => ({
    bbox: detection.bbox,
    confidence: detection.confidence,
    key: `tile-${index}-${detection.symbol}`,
    symbol: detection.symbol as ScanFaceSymbol,
  }))
}

function scanBoxStroke(symbol: ScanFaceSymbol): string {
  return scanSymbolDetails[symbol].background
}

function scanBoxFill(symbol: ScanFaceSymbol): string {
  return scanSymbolDetails[symbol].background
}

function scanBoxLabel(symbol: ScanFaceSymbol): string {
  return scanColorCode(symbol)
}

function cameraStatusLabel({
  detectionMode,
  stableFrameCount,
  stickerCount,
  targetStickerCount,
  t,
  trackingStatus,
}: {
  detectionMode?: string | null
  stableFrameCount: number
  stickerCount: number
  targetStickerCount: number
  t: ReturnType<typeof useTranslation>['t']
  trackingStatus: LiveScanPreviewStatus
}): string | undefined {
  if (trackingStatus === 'holding_steady') {
    return t('scan.camera.holdSteady', { count: stableFrameCount, target: 6 })
  }

  if (trackingStatus === 'tracking') {
    return t('scan.camera.tracking', { count: stableFrameCount, target: 6 })
  }

  if (stickerCount > 0) {
    return t(
      stickerCount >= targetStickerCount
        ? 'scan.camera.stickersReady'
        : 'scan.camera.stickersFound',
      {
        count: Math.min(targetStickerCount, stickerCount),
        total: targetStickerCount,
      },
    )
  }

  if (detectionMode == null) {
    return undefined
  }

  if (detectionMode === 'rejected') {
    return t('scan.camera.lookingForCube')
  }

  return t('scan.camera.lookingForCube')
}

function average(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length
}
