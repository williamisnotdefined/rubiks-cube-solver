import { memo, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import type { ScanAnalysisPoint } from '@api/scan'
import type { LiveScanPreviewStatus } from './hooks/useLiveScanPreview'

type ScanCameraStatus = 'idle' | 'loading' | 'ready' | 'error'

type ScanCameraFrameProps = {
  cameraMessage?: string
  cameraStatus: ScanCameraStatus
  centerMismatch?: boolean
  detectionMode?: string | null
  faceQuad?: readonly ScanAnalysisPoint[]
  faceConfidence?: number
  photoDataUrl?: string
  stableFrameCount?: number
  stickerPolygons?: readonly {
    confidence: number
    index: number
    polygon: readonly ScanAnalysisPoint[]
  }[]
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
  photoDataUrl,
  stableFrameCount = 0,
  stickerPolygons = [],
  trackingStatus = 'idle',
  videoRef,
}: ScanCameraFrameProps) {
  const { t } = useTranslation()
  const hasDetectedFace = faceQuad.length === 4
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
    stableFrameCount,
    t,
    trackingStatus,
  })

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
      {hasDetectedFace || stickerPolygons.length > 0 ? (
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
          {stickerPolygons
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
            ))}
        </svg>
      ) : null}
      {statusLabel === undefined ? null : (
        <div className="absolute left-2 top-2 border border-[#2b2b2b] bg-[#070707]/80 px-2 py-1 text-[0.65rem] font-extrabold uppercase tracking-[0.12em] text-[#f7f7f7]">
          {statusLabel}
        </div>
      )}
      {hasDetectedFace ? null : (
        <div className="pointer-events-none absolute left-1/2 top-1/2 grid aspect-square w-[72%] -translate-x-1/2 -translate-y-1/2 grid-cols-3 grid-rows-3 gap-1 border border-dashed border-[#f7f7f7]/30 p-1">
          {Array.from({ length: 9 }, (_, index) => (
            <div className="border border-dashed border-[#f7f7f7]/20" key={index} />
          ))}
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

function cameraStatusLabel({
  detectionMode,
  faceConfidence,
  stableFrameCount,
  t,
  trackingStatus,
}: {
  detectionMode?: string | null
  faceConfidence?: number
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
