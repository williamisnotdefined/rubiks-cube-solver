import { memo, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import type { ScanAnalysisPoint, ScanDetectionBox, ScanGridDetection, ScanTileDetection } from '@api/scan'
import type { LiveScanPreviewStatus } from './hooks/useLiveScanPreview'
import type { TemporalFaceConsensus } from './scanTemporalConsensus'
import { scanSymbolDetails } from './scanState'

type ScanCameraStatus = 'idle' | 'loading' | 'ready' | 'error'

type OverlayStickerBox = {
  bbox: ScanDetectionBox
  confidence: number
  key: string
  symbol?: ScanGridDetection['symbol'] | ScanTileDetection['symbol']
}

type ScanCameraFrameProps = {
  cameraMessage?: string
  cameraStatus: ScanCameraStatus
  centerMismatch?: boolean
  detectionMode?: string | null
  faceQuad?: readonly ScanAnalysisPoint[]
  faceConfidence?: number
  gridConfidence?: number
  gridDetections?: readonly ScanGridDetection[]
  gridStatus?: string
  photoDataUrl?: string
  stableFrameCount?: number
  stickerPolygons?: readonly {
    confidence: number
    index: number
    polygon: readonly ScanAnalysisPoint[]
  }[]
  temporalConsensus?: TemporalFaceConsensus
  tileDetections?: readonly ScanTileDetection[]
  trackingStatus?: LiveScanPreviewStatus
  videoRef: RefObject<HTMLVideoElement | null>
}

export const ScanCameraFrame = memo(function ScanCameraFrame({
  cameraMessage,
  cameraStatus,
  centerMismatch = false,
  detectionMode,
  faceQuad = [],
  faceConfidence,
  gridConfidence,
  gridDetections = [],
  gridStatus,
  photoDataUrl,
  stableFrameCount = 0,
  stickerPolygons = [],
  temporalConsensus,
  tileDetections = [],
  trackingStatus = 'idle',
  videoRef,
}: ScanCameraFrameProps) {
  const { t } = useTranslation()
  const stickerBoxes = stickerOverlayBoxes(gridDetections, tileDetections)
  const showDerivedFaceGrid = stickerBoxes.length === 0
  const hasDetectedFace = showDerivedFaceGrid && faceQuad.length === 4
  const detectionStroke = centerMismatch
    ? '#ef4444'
    : trackingStatus === 'holding_steady'
      ? '#22c55e'
      : trackingStatus === 'tracking'
        ? '#fbbf24'
        : '#f7f7f7'
  const statusLabel = cameraStatusLabel({
    detectionMode,
    faceConfidence,
    gridDetections,
    gridStatus,
    stableFrameCount,
    t,
    trackingStatus,
  })
  const temporalStatusLabel = temporalConsensusLabel(temporalConsensus, t)

  return (
    <div className="relative aspect-square w-full max-w-[32rem] justify-self-center overflow-hidden border border-[#2b2b2b] bg-[#070707]">
      <video
        className={photoDataUrl === undefined ? 'block size-full object-cover' : 'hidden'}
        muted
        playsInline
        ref={videoRef}
      />
      {photoDataUrl === undefined ? null : (
        <img className="block size-full object-cover" src={photoDataUrl} alt={t('scan.camera.capturedFaceAlt')} />
      )}
      {hasDetectedFace || (showDerivedFaceGrid && stickerPolygons.length > 0) || stickerBoxes.length > 0 ? (
        <svg className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 100 100">
          {hasDetectedFace ? (
            <polygon
              fill="none"
              points={svgPoints(faceQuad)}
              stroke={detectionStroke}
              strokeOpacity="0.85"
              strokeWidth={trackingStatus === 'holding_steady' ? '0.9' : '0.7'}
            />
          ) : null}
          {showDerivedFaceGrid
            ? stickerPolygons
                .filter((sticker) => sticker.polygon.length >= 3)
                .map((sticker) => (
                  <polygon
                    fill="none"
                    key={sticker.index}
                    points={svgPoints(sticker.polygon)}
                    stroke={sticker.confidence < 0.3 ? '#fbbf24' : detectionStroke}
                    strokeOpacity="0.85"
                    strokeWidth="0.45"
                  />
                ))
            : null}
          {stickerBoxes.map((detection) => (
            <g key={detection.key}>
              <rect
                fill={scanBoxFill(detection.symbol)}
                fillOpacity="0.1"
                height={detection.bbox.height * 100}
                stroke={scanBoxStroke(detection.symbol)}
                strokeOpacity={gridStatus === 'ready' ? '0.95' : '0.72'}
                strokeWidth={gridStatus === 'ready' ? '0.65' : '0.45'}
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
                {detection.symbol} {Math.round(detection.confidence * 100)}
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
      {gridConfidence === undefined || gridConfidence <= 0 ? null : (
        <div className="absolute bottom-2 left-2 border border-[#2b2b2b] bg-[#070707]/80 px-2 py-1 text-[0.65rem] font-extrabold uppercase tracking-[0.12em] text-[#f7f7f7]">
          {t('scan.camera.gridConfidence', { confidence: Math.round(gridConfidence * 100) })}
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

function svgPoints(points: readonly ScanAnalysisPoint[]): string {
  return points.map((point) => `${point.x * 100},${point.y * 100}`).join(' ')
}

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

function stickerOverlayBoxes(
  gridDetections: readonly ScanGridDetection[],
  tileDetections: readonly ScanTileDetection[],
): OverlayStickerBox[] {
  if (gridDetections.length > 0) {
    return gridDetections
      .filter((detection) => detection.bbox !== undefined)
      .map((detection) => ({
        bbox: detection.bbox as ScanDetectionBox,
        confidence: detection.confidence,
        key: `grid-${detection.index}`,
        symbol: detection.symbol,
      }))
  }

  return tileDetections
    .filter((detection) => detection.symbol !== 'face')
    .map((detection, index) => ({
      bbox: detection.bbox,
      confidence: detection.confidence,
      key: `tile-${index}-${detection.symbol}`,
      symbol: detection.symbol,
    }))
}

function scanBoxStroke(symbol: ScanGridDetection['symbol'] | ScanTileDetection['symbol']): string {
  if (symbol === undefined || symbol === 'face') {
    return '#f7f7f7'
  }

  return scanSymbolDetails[symbol].background
}

function scanBoxFill(symbol: ScanGridDetection['symbol'] | ScanTileDetection['symbol']): string {
  if (symbol === undefined || symbol === 'face') {
    return '#f7f7f7'
  }

  return scanSymbolDetails[symbol].background
}

function cameraStatusLabel({
  detectionMode,
  faceConfidence,
  gridDetections,
  gridStatus,
  stableFrameCount,
  t,
  trackingStatus,
}: {
  detectionMode?: string | null
  faceConfidence?: number
  gridDetections: readonly ScanGridDetection[]
  gridStatus?: string
  stableFrameCount: number
  t: ReturnType<typeof useTranslation>['t']
  trackingStatus: LiveScanPreviewStatus
}): string | undefined {
  if (trackingStatus === 'holding_steady') {
    return t('scan.camera.holdSteady', { count: stableFrameCount, target: 6 })
  }

  if (trackingStatus === 'tracking') {
    return t('scan.camera.tracking', { count: stableFrameCount, target: 6 })
  }

  if (gridDetections.length > 0) {
    return t(gridStatus === 'ready' ? 'scan.camera.stickersReady' : 'scan.camera.stickersFound', {
      count: gridDetections.length,
    })
  }

  if (detectionMode == null) {
    return undefined
  }

  if (detectionMode === 'guide_fallback' || detectionMode === 'rejected') {
    return t('scan.camera.lookingForCube')
  }

  const mode = t(`scan.camera.modes.${detectionMode}`, {
    defaultValue: detectionMode.replaceAll('_', ' '),
  })
  if (faceConfidence === undefined) {
    return mode
  }

  return t('scan.camera.statusWithConfidence', {
    confidence: Math.round(faceConfidence * 100),
    mode,
  })
}
