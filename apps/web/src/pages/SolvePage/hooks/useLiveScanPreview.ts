import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useAnalyzeScanFace,
  type AnalyzeScanFaceResponse,
  type RgbColor,
  type ScanAnalysisPoint,
} from '@api/scan'
import type { ScanFaceSymbol } from '@api/solver/types'
import { captureScanPreviewImage } from '../scanCapture'

export type LiveScanPreviewStatus = 'idle' | 'searching' | 'tracking' | 'holding_steady' | 'error'

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
}

const previewIntervalMs = 320
const minFaceConfidence = 0.5
const goodFaceConfidence = 0.72
const stableFrameTarget = 6
const maxQuadMovement = 0.018
const criticalQualityWarnings = new Set(['image_blurry', 'image_too_dark', 'image_too_bright'])
const autoCaptureDetectionModes = new Set(['contour', 'sticker_grid', 'face_detector'])

export function useLiveScanPreview({
  enabled,
  expectedCenter,
  knownCenters,
  videoRef,
}: UseLiveScanPreviewOptions): UseLiveScanPreviewResult {
  const { t } = useTranslation()
  const { mutateAsync } = useAnalyzeScanFace()
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
  }, [enabled, t])

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

        updateTracking(analysis)
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

    function updateTracking(analysis: AnalyzeScanFaceResponse) {
      const previousAnalysis = previousAnalysisRef.current
      const canAutoCaptureCurrent = isAutoCaptureReadyAnalysis(analysis)
      const previousCanAutoCapture =
        previousAnalysis !== undefined && isAutoCaptureReadyAnalysis(previousAnalysis)
      const movement =
        previousAnalysis === undefined ? Number.POSITIVE_INFINITY : averageQuadMovement(previousAnalysis.faceQuad, analysis.faceQuad)
      const nextStableFrameCount = canAutoCaptureCurrent
        ? previousCanAutoCapture && movement <= maxQuadMovement
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
  }, [enabled, expectedCenter, knownCenters, mutateAsync, t, videoRef])

  return {
    latestAnalysis,
    message,
    resetAutoCapture,
    shouldAutoCapture,
    stableFrameCount,
    status,
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

  if (status === 'tracking') {
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
  return (
    analysis.faceQuad.length === 4 &&
    analysis.faceConfidence >= minFaceConfidence &&
    autoCaptureDetectionModes.has(analysis.detectionMode ?? '')
  )
}

function isAutoCaptureReadyAnalysis(analysis: AnalyzeScanFaceResponse): boolean {
  return (
    isTrackableAnalysis(analysis) &&
    analysis.faceConfidence >= goodFaceConfidence &&
    !analysis.centerMismatch &&
    !hasCriticalQualityWarning(analysis)
  )
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
