import { memo, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import type { ScanDetectionBox, ScanTileDetection } from '@api/scan'
import type { LiveScanPreviewStatus } from './hooks/useLiveScanPreview'
import { scanColorCode } from './scanColorSymbols'
import type { TemporalFaceConsensus } from './scanTemporalConsensus'
import { scanSymbolDetails } from './scanState'
import { validStickerTileDetections } from './scanTileDetections'

type ScanCameraStatus = 'idle' | 'loading' | 'ready' | 'error'

type OverlayStickerBox = {
  bbox: ScanDetectionBox
  confidence: number
  key: string
  symbol: ScanTileDetection['symbol']
}

type ScanCameraFrameProps = {
  cameraMessage?: string
  cameraStatus: ScanCameraStatus
  detectionMode?: string | null
  stableFrameCount?: number
  temporalConsensus?: TemporalFaceConsensus
  tileDetections?: readonly ScanTileDetection[]
  trackingStatus?: LiveScanPreviewStatus
  videoRef: RefObject<HTMLVideoElement | null>
}

export const ScanCameraFrame = memo(function ScanCameraFrame({
  cameraMessage,
  cameraStatus,
  detectionMode,
  stableFrameCount = 0,
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
    t,
    trackingStatus,
  })
  const temporalStatusLabel = temporalConsensusLabel(temporalConsensus, t)
  const tileConfidence = average(stickerBoxes.map((box) => box.confidence))

  return (
    <div className="relative aspect-square w-full max-w-[32rem] justify-self-center overflow-hidden border border-[#2b2b2b] bg-[#070707]">
      <video
        className="block size-full object-cover"
        muted
        playsInline
        ref={videoRef}
      />
      {stickerBoxes.length > 0 ? (
        <svg className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 100 100">
          {stickerBoxes.map((detection) => (
            <g key={detection.key}>
              <rect
                fill={scanBoxFill(detection.symbol)}
                fillOpacity="0.1"
                height={detection.bbox.height * 100}
                stroke={scanBoxStroke(detection.symbol)}
                strokeOpacity={trackingStatus === 'holding_steady' ? '0.95' : '0.72'}
                strokeWidth={trackingStatus === 'holding_steady' ? '0.65' : '0.45'}
                width={detection.bbox.width * 100}
                x={(detection.bbox.x - detection.bbox.width / 2) * 100}
                y={(detection.bbox.y - detection.bbox.height / 2) * 100}
              />
              <text
                fill="#f7f7f7"
                fontSize="3.1"
                fontWeight="800"
                stroke="#070707"
                strokeWidth="0.25"
                x={(detection.bbox.x - detection.bbox.width / 2) * 100 + 1}
                y={(detection.bbox.y - detection.bbox.height / 2) * 100 + 4}
              >
                {scanBoxLabel(detection.symbol)} {Math.round(detection.confidence * 100)}
              </text>
            </g>
          ))}
        </svg>
      ) : null}
      {statusLabel === undefined ? null : (
        <div className="absolute left-2 top-2 border border-[#2b2b2b] bg-[#070707]/80 px-2 py-1 text-[0.65rem] font-extrabold uppercase tracking-[0.12em] text-[#f7f7f7]">
          {statusLabel}
        </div>
      )}
      {temporalStatusLabel === undefined ? null : (
        <div className="absolute right-2 top-2 border border-[#2b2b2b] bg-[#070707]/80 px-2 py-1 text-[0.65rem] font-extrabold uppercase tracking-[0.12em] text-[#f7f7f7]">
          {temporalStatusLabel}
        </div>
      )}
      {tileConfidence <= 0 ? null : (
        <div className="absolute bottom-2 left-2 border border-[#2b2b2b] bg-[#070707]/80 px-2 py-1 text-[0.65rem] font-extrabold uppercase tracking-[0.12em] text-[#f7f7f7]">
          {t('scan.camera.stickerConfidence', { confidence: Math.round(tileConfidence * 100) })}
        </div>
      )}
      {cameraStatus === 'loading' ? (
        <div className="absolute inset-0 grid place-items-center bg-[#070707]/70 text-sm font-extrabold uppercase tracking-[0.16em] text-[#f7f7f7]">
          {t('scan.camera.opening')}
        </div>
      ) : null}
      {cameraStatus === 'error' ? (
        <div className="absolute inset-0 grid place-items-center bg-[#070707]/85 p-4 text-center text-sm font-semibold leading-relaxed text-[#f7f7f7]">
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
  return validStickerTileDetections(tileDetections)
    .map((detection, index) => ({
      bbox: detection.bbox,
      confidence: detection.confidence,
      key: `tile-${index}-${detection.symbol}`,
      symbol: detection.symbol,
    }))
}

function scanBoxStroke(symbol: ScanTileDetection['symbol']): string {
  if (symbol === 'face') {
    return '#f7f7f7'
  }

  return scanSymbolDetails[symbol].background
}

function scanBoxFill(symbol: ScanTileDetection['symbol']): string {
  if (symbol === 'face') {
    return '#f7f7f7'
  }

  return scanSymbolDetails[symbol].background
}

function scanBoxLabel(symbol: ScanTileDetection['symbol']): string {
  if (symbol === 'face') {
    return '?'
  }

  return scanColorCode(symbol)
}

function cameraStatusLabel({
  detectionMode,
  stableFrameCount,
  stickerCount,
  t,
  trackingStatus,
}: {
  detectionMode?: string | null
  stableFrameCount: number
  stickerCount: number
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
    return t(stickerCount >= 9 ? 'scan.camera.stickersReady' : 'scan.camera.stickersFound', {
      count: Math.min(9, stickerCount),
    })
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
