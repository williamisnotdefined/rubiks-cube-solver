import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useAnalyzeScanFace,
  type AnalyzeScanFaceResponse,
  type ScanDetectionBox,
  type RgbColor,
  type ScanAnalysisPoint,
} from '@api/scan'
import type { ScanFaceSymbol } from '@api/solver/types'
import { captureScanPreviewImage } from '../scanCapture'
import { useTemporalScanConsensus } from './useTemporalScanConsensus'
import type { TemporalFaceConsensus } from '../scanTemporalConsensus'

export type LiveScanPreviewStatus =
  | 'idle'
  | 'searching'
  | 'detecting_stickers'
  | 'partial_grid'
  | 'tracking'
  | 'holding_steady'
  | 'error'

type UseLiveScanPreviewOptions = {
  enabled: boolean
  expectedCenter: ScanFaceSymbol
  knownCenters: Partial<Record<ScanFaceSymbol, RgbColor>>
  videoRef: RefObject<HTMLVideoElement | null>
}

type UseLiveScanPreviewResult = {
  latestAnalysis?: AnalyzeScanFaceResponse
  message: string
  resetAutoCapture: () => void
  shouldAutoCapture: boolean
  stableFrameCount: number
  status: LiveScanPreviewStatus
  temporalConsensus: TemporalFaceConsensus
}

const previewIntervalMs = 320
const minFaceConfidence = 0.5
const goodFaceConfidence = 0.72
const minTileGridConfidence = 0.62
const minTileGridDetections = 8
const stableFrameTarget = 6
const maxQuadMovement = 0.018
const maxGridMovement = 0.025
const criticalQualityWarnings = new Set(['image_blurry', 'image_too_dark', 'image_too_bright'])
const autoCaptureDetectionModes = new Set(['tile_detector', 'sticker_grid'])

export function useLiveScanPreview({
  enabled,
  expectedCenter,
  knownCenters,
  videoRef,
}: UseLiveScanPreviewOptions): UseLiveScanPreviewResult {
  const { t } = useTranslation()
  const { mutateAsync } = useAnalyzeScanFace()
  const {
    recordAnalysis: recordTemporalAnalysis,
    resetTemporalConsensus,
    temporalConsensus,
  } = useTemporalScanConsensus({ enabled, expectedCenter })
  const previousAnalysisRef = useRef<AnalyzeScanFaceResponse | undefined>(undefined)
  const stableFrameCountRef = useRef(0)
  const autoCaptureFiredRef = useRef(false)
  const [latestAnalysis, setLatestAnalysis] = useState<AnalyzeScanFaceResponse | undefined>()
  const [message, setMessage] = useState(() => t('scan.live.looking'))
  const [shouldAutoCapture, setShouldAutoCapture] = useState(false)
  const [stableFrameCount, setStableFrameCount] = useState(0)
  const [status, setStatus] = useState<LiveScanPreviewStatus>('idle')

  const resetAutoCapture = useCallback(() => {
    autoCaptureFiredRef.current = false
    setShouldAutoCapture(false)
  }, [])

  const resetTracking = useCallback(() => {
    previousAnalysisRef.current = undefined
    stableFrameCountRef.current = 0
    autoCaptureFiredRef.current = false
    setLatestAnalysis(undefined)
    setMessage(t('scan.live.looking'))
    setShouldAutoCapture(false)
    setStableFrameCount(0)
    setStatus(enabled ? 'searching' : 'idle')
    resetTemporalConsensus()
  }, [enabled, resetTemporalConsensus, t])

  useEffect(() => {
    resetTracking()
  }, [expectedCenter, resetTracking])

  useEffect(() => {
    if (!enabled) {
      previousAnalysisRef.current = undefined
      stableFrameCountRef.current = 0
      setShouldAutoCapture(false)
      setStableFrameCount(0)
      setStatus('idle')
      return undefined
    }

    let cancelled = false
    let timeoutId: number | undefined

    function scheduleNextPreview() {
      timeoutId = window.setTimeout(() => {
        void runPreview()
      }, previewIntervalMs)
    }

    async function runPreview() {
      if (cancelled) {
        return
      }

      if (document.visibilityState === 'hidden') {
        scheduleNextPreview()
        return
      }

      const video = videoRef.current
      if (video === null) {
        setStatus('searching')
        setMessage(t('scan.live.looking'))
        scheduleNextPreview()
        return
      }

      const capture = captureScanPreviewImage(video)
      if (capture === undefined) {
        setStatus('searching')
        setMessage(t('scan.live.looking'))
        scheduleNextPreview()
        return
      }

      try {
        const analysis = await mutateAsync({
          expectedCenter,
          image: capture.photoDataUrl,
          knownCenters,
        })

        if (cancelled) {
          return
        }

        updateTracking(analysis, capture.capturedAt)
      } catch (error) {
        if (!cancelled) {
          setStatus('error')
          setMessage(error instanceof Error ? error.message : t('scan.live.scanFailed'))
        }
      } finally {
        if (!cancelled) {
          scheduleNextPreview()
        }
      }
    }

    function updateTracking(analysis: AnalyzeScanFaceResponse, capturedAt: number) {
      const previousAnalysis = previousAnalysisRef.current
      recordTemporalAnalysis(analysis, capturedAt)
      const canAutoCaptureCurrent = isAutoCaptureReadyAnalysis(analysis)
      const previousCanAutoCapture =
        previousAnalysis !== undefined && isAutoCaptureReadyAnalysis(previousAnalysis)
      const movement =
        previousAnalysis === undefined ? Number.POSITIVE_INFINITY : averageAnalysisMovement(previousAnalysis, analysis)
      const maxMovement = (analysis.gridDetections?.length ?? 0) > 0 ? maxGridMovement : maxQuadMovement
      const nextStableFrameCount = canAutoCaptureCurrent
        ? previousCanAutoCapture && movement <= maxMovement
          ? stableFrameCountRef.current + 1
          : 1
        : 0
      const nextStatus = liveStatusFromAnalysis(analysis, nextStableFrameCount)

      previousAnalysisRef.current = analysis
      stableFrameCountRef.current = nextStableFrameCount
      setLatestAnalysis(analysis)
      setStableFrameCount(nextStableFrameCount)
      setStatus(nextStatus)
      setMessage(liveScanMessage(analysis, nextStatus, t))

      if (nextStableFrameCount >= stableFrameTarget && !autoCaptureFiredRef.current) {
        autoCaptureFiredRef.current = true
        setShouldAutoCapture(true)
        setStatus('holding_steady')
        setMessage(t('scan.live.stableCapturing'))
      } else if (!autoCaptureFiredRef.current) {
        setShouldAutoCapture(false)
      }
    }

    setStatus('searching')
    setMessage(t('scan.live.looking'))
    scheduleNextPreview()

    return () => {
      cancelled = true
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [enabled, expectedCenter, knownCenters, mutateAsync, recordTemporalAnalysis, t, videoRef])

  return {
    latestAnalysis,
    message,
    resetAutoCapture,
    shouldAutoCapture,
    stableFrameCount,
    status,
    temporalConsensus,
  }
}

function liveStatusFromAnalysis(
  analysis: AnalyzeScanFaceResponse,
  nextStableFrameCount: number,
): LiveScanPreviewStatus {
  if (nextStableFrameCount >= stableFrameTarget) {
    return 'holding_steady'
  }

  if (isTrackableAnalysis(analysis)) {
    return 'tracking'
  }

  if ((analysis.gridDetections?.length ?? 0) >= 6 || analysis.gridStatus === 'partial') {
    return 'partial_grid'
  }

  if ((analysis.tileDetections?.length ?? 0) > 0) {
    return 'detecting_stickers'
  }

  return 'searching'
}

function liveScanMessage(
  analysis: AnalyzeScanFaceResponse,
  status: LiveScanPreviewStatus,
  t: ReturnType<typeof useTranslation>['t'],
): string {
  if (status === 'holding_steady') {
    return t('scan.live.stableCapturing')
  }

  if (analysis.centerMismatch) {
    return t('scan.live.centerMismatch')
  }

  const warningMessage = qualityWarningMessage(analysis, t)
  if (warningMessage !== undefined) {
    return warningMessage
  }

  const gridCount = analysis.gridDetections?.length ?? 0

  if (status === 'partial_grid') {
    return t('scan.live.partialGrid', { count: gridCount })
  }

  if (status === 'detecting_stickers') {
    return t('scan.live.detectingStickers', {
      count: Math.min(9, analysis.tileDetections?.filter((detection) => detection.symbol !== 'face').length ?? 0),
    })
  }

  if (status === 'tracking') {
    if (gridCount > 0) {
      return t('scan.live.gridReady', { count: gridCount })
    }

    return t('scan.live.faceDetected')
  }

  return t('scan.live.looking')
}

function qualityWarningMessage(
  analysis: AnalyzeScanFaceResponse,
  t: ReturnType<typeof useTranslation>['t'],
): string | undefined {
  const warnings = new Set([...(analysis.qualityWarnings ?? []), ...(analysis.warnings ?? [])])

  if (warnings.has('image_blurry')) {
    return t('scan.live.imageBlurry')
  }

  if (warnings.has('image_too_dark')) {
    return t('scan.live.tooDark')
  }

  if (warnings.has('image_too_bright')) {
    return t('scan.live.tooBright')
  }

  if (analysis.detectionMode === 'guide_fallback') {
    return t('scan.live.lookingKeepVisible')
  }

  return undefined
}

function isTrackableAnalysis(analysis: AnalyzeScanFaceResponse): boolean {
  if (
    analysis.detectionMode === 'tile_detector' &&
    analysis.gridStatus === 'ready' &&
    (analysis.gridDetections?.length ?? 0) >= minTileGridDetections
  ) {
    return true
  }

  return (
    analysis.faceQuad.length === 4 &&
    analysis.faceConfidence >= minFaceConfidence &&
    autoCaptureDetectionModes.has(analysis.detectionMode ?? '')
  )
}

function isAutoCaptureReadyAnalysis(analysis: AnalyzeScanFaceResponse): boolean {
  if (analysis.detectionMode === 'tile_detector') {
    return (
      isTrackableAnalysis(analysis) &&
      (analysis.gridConfidence ?? 0) >= minTileGridConfidence &&
      !analysis.centerMismatch &&
      !hasCriticalQualityWarning(analysis)
    )
  }

  return (
    isTrackableAnalysis(analysis) &&
    analysis.faceConfidence >= goodFaceConfidence &&
    !analysis.centerMismatch &&
    !hasCriticalQualityWarning(analysis)
  )
}

function averageAnalysisMovement(
  previousAnalysis: AnalyzeScanFaceResponse,
  nextAnalysis: AnalyzeScanFaceResponse,
): number {
  const gridMovement = averageGridMovement(previousAnalysis, nextAnalysis)

  if (Number.isFinite(gridMovement)) {
    return gridMovement
  }

  return averageQuadMovement(previousAnalysis.faceQuad, nextAnalysis.faceQuad)
}

function averageGridMovement(
  previousAnalysis: AnalyzeScanFaceResponse,
  nextAnalysis: AnalyzeScanFaceResponse,
): number {
  const previousBoxes = gridBoxesByIndex(previousAnalysis)
  const nextBoxes = gridBoxesByIndex(nextAnalysis)
  const sharedIndexes = [...previousBoxes.keys()].filter((index) => nextBoxes.has(index))

  if (sharedIndexes.length < minTileGridDetections) {
    return Number.POSITIVE_INFINITY
  }

  const total = sharedIndexes.reduce((sum, index) => {
    const previousBox = previousBoxes.get(index)
    const nextBox = nextBoxes.get(index)

    if (previousBox === undefined || nextBox === undefined) {
      return sum
    }

    return sum + boxMovement(previousBox, nextBox)
  }, 0)

  return total / sharedIndexes.length
}

function gridBoxesByIndex(analysis: AnalyzeScanFaceResponse): Map<number, ScanDetectionBox> {
  return new Map(
    (analysis.gridDetections ?? [])
      .filter((detection) => detection.bbox !== undefined)
      .map((detection) => [detection.index, detection.bbox as ScanDetectionBox]),
  )
}

function boxMovement(previousBox: ScanDetectionBox, nextBox: ScanDetectionBox): number {
  return Math.hypot(previousBox.x - nextBox.x, previousBox.y - nextBox.y)
}

function hasCriticalQualityWarning(analysis: AnalyzeScanFaceResponse): boolean {
  return [...(analysis.qualityWarnings ?? []), ...(analysis.warnings ?? [])].some((warning) =>
    criticalQualityWarnings.has(warning),
  )
}

export function averageQuadMovement(
  previousQuad: readonly ScanAnalysisPoint[],
  nextQuad: readonly ScanAnalysisPoint[],
): number {
  if (previousQuad.length !== 4 || nextQuad.length !== 4) {
    return Number.POSITIVE_INFINITY
  }

  const total = previousQuad.reduce((sum, previousPoint, index) => {
    const nextPoint = nextQuad[index]
    return sum + Math.hypot(previousPoint.x - nextPoint.x, previousPoint.y - nextPoint.y)
  }, 0)

  return total / previousQuad.length
}
