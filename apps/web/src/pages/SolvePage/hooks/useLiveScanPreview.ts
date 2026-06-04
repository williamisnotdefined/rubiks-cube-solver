import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useAnalyzeScanFace,
  type AnalyzeScanFaceResponse,
  type ScanDetectionBox,
  type RgbColor,
} from '@api/scan'
import type { ScanFaceSymbol } from '@api/solver/types'
import { captureScanPreviewImage, type CapturedScanImage } from '../scanCapture'
import { useTemporalScanConsensus } from './useTemporalScanConsensus'
import {
  hasCompleteTileDetections,
  isTemporalConsensusReady,
  tileAssignmentFromAnalysis,
  type TemporalFaceConsensus,
} from '../scanTemporalConsensus'
import { validStickerTileDetections } from '../scanTileDetections'

export type LiveScanPreviewStatus =
  | 'idle'
  | 'searching'
  | 'detecting_stickers'
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
  latestCapture?: CapturedScanImage
  acknowledgeAutoFill: () => void
  message: string
  resetAutoFill: () => void
  shouldAutoFill: boolean
  stableFrameCount: number
  status: LiveScanPreviewStatus
  temporalConsensus: TemporalFaceConsensus
}

const previewIntervalMs = 750
const minFaceConfidence = 0.5
const goodFaceConfidence = 0.72
const minTileConfidence = 0.62
const minTileDetections = 9
const stableFrameTarget = 6
const maxTileMovement = 0.025
const criticalQualityWarnings = new Set(['image_blurry', 'image_too_dark', 'image_too_bright'])
const qualityWarningMessages = [
  ['image_blurry', 'scan.live.imageBlurry'],
  ['image_too_dark', 'scan.live.tooDark'],
  ['image_too_bright', 'scan.live.tooBright'],
  ['tile_detector_partial', 'scan.live.lookingKeepVisible'],
] as const

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
  const [latestAnalysis, setLatestAnalysis] = useState<AnalyzeScanFaceResponse | undefined>()
  const [latestCapture, setLatestCapture] = useState<CapturedScanImage | undefined>()
  const [message, setMessage] = useState(() => t('scan.live.looking'))
  const [shouldAutoFill, setShouldAutoFill] = useState(false)
  const [stableFrameCount, setStableFrameCount] = useState(0)
  const [status, setStatus] = useState<LiveScanPreviewStatus>('idle')

  const acknowledgeAutoFill = useCallback(() => {
    setShouldAutoFill(false)
  }, [])

  const resetAutoFill = useCallback(() => {
    setShouldAutoFill(false)
  }, [])

  const resetTracking = useCallback(() => {
    previousAnalysisRef.current = undefined
    stableFrameCountRef.current = 0
    setLatestAnalysis(undefined)
    setLatestCapture(undefined)
    setMessage(t('scan.live.looking'))
    setShouldAutoFill(false)
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
      setShouldAutoFill(false)
      setStableFrameCount(0)
      setStatus('idle')
      return undefined
    }

    let cancelled = false
    let abortController: AbortController | undefined
    let timeoutId: number

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

      abortController = new AbortController()

      try {
        const analysis = await mutateAsync({
          expectedCenter,
          image: capture.photoDataUrl,
          knownCenters,
          signal: abortController.signal,
        })

        if (cancelled) {
          return
        }

        updateTracking(analysis, capture)
      } catch (error) {
        if (!cancelled && !isAbortError(error)) {
          setStatus('error')
          setMessage(error instanceof Error ? error.message : t('scan.live.scanFailed'))
        }
      } finally {
        abortController = undefined
        if (!cancelled) {
          scheduleNextPreview()
        }
      }
    }

    function updateTracking(analysis: AnalyzeScanFaceResponse, capture: CapturedScanImage) {
      const previousAnalysis = previousAnalysisRef.current
      const consensus = recordTemporalAnalysis(analysis, capture.capturedAt)
      const canAutoFillCurrent = isAutoFillReadyAnalysis(analysis, expectedCenter)
      const previousCanAutoFill =
        previousAnalysis !== undefined && isAutoFillReadyAnalysis(previousAnalysis, expectedCenter)
      const movement =
        previousAnalysis === undefined ? Number.POSITIVE_INFINITY : averageAnalysisMovement(previousAnalysis, analysis)
      const nextStableFrameCount = canAutoFillCurrent
        ? previousCanAutoFill && movement <= maxTileMovement
          ? stableFrameCountRef.current + 1
          : 1
        : 0
      const nextStatus = liveStatusFromAnalysis(analysis, nextStableFrameCount, expectedCenter)

      previousAnalysisRef.current = analysis
      stableFrameCountRef.current = nextStableFrameCount
      setLatestAnalysis(analysis)
      setLatestCapture(capture)
      setStableFrameCount(nextStableFrameCount)
      setStatus(nextStatus)
      setMessage(liveScanMessage(analysis, nextStatus, t))

      if (
        nextStableFrameCount >= stableFrameTarget &&
        isTemporalConsensusReady(consensus)
      ) {
        setShouldAutoFill(true)
        setStatus('holding_steady')
        setMessage(t('scan.live.stableCapturing'))
      } else {
        setShouldAutoFill(false)
      }
    }

    setStatus('searching')
    setMessage(t('scan.live.looking'))
    scheduleNextPreview()

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
      abortController?.abort()
    }
  }, [enabled, expectedCenter, knownCenters, mutateAsync, recordTemporalAnalysis, t, videoRef])

  return {
    acknowledgeAutoFill,
    latestAnalysis,
    latestCapture,
    message,
    resetAutoFill,
    shouldAutoFill,
    stableFrameCount,
    status,
    temporalConsensus,
  }
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: unknown }).name === 'AbortError'
  )
}

function liveStatusFromAnalysis(
  analysis: AnalyzeScanFaceResponse,
  nextStableFrameCount: number,
  expectedCenter: ScanFaceSymbol,
): LiveScanPreviewStatus {
  if (nextStableFrameCount >= stableFrameTarget) {
    return 'holding_steady'
  }

  if (isTrackableAnalysis(analysis, expectedCenter)) {
    return 'tracking'
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

  if (status === 'detecting_stickers') {
    return t('scan.live.detectingStickers', {
      count: Math.min(9, validStickerTileDetections(analysis.tileDetections).length),
    })
  }

  if (status === 'tracking') {
    return t('scan.live.gridReady', { count: minTileDetections })
  }

  return t('scan.live.looking')
}

function qualityWarningMessage(
  analysis: AnalyzeScanFaceResponse,
  t: ReturnType<typeof useTranslation>['t'],
): string | undefined {
  const warnings = new Set([...analysis.qualityWarnings, ...analysis.warnings])
  const matchedWarning = qualityWarningMessages.find(([warning]) => warnings.has(warning))

  return matchedWarning === undefined ? undefined : t(matchedWarning[1])
}

function isTrackableAnalysis(analysis: AnalyzeScanFaceResponse, expectedCenter: ScanFaceSymbol): boolean {
  return (
    analysis.detectionMode === 'tile_detector' &&
    hasCompleteTileDetections(analysis, expectedCenter) &&
    analysis.faceConfidence >= minFaceConfidence
  )
}

function isAutoFillReadyAnalysis(analysis: AnalyzeScanFaceResponse, expectedCenter: ScanFaceSymbol): boolean {
  return (
    isTrackableAnalysis(analysis, expectedCenter) &&
    analysis.faceConfidence >= goodFaceConfidence &&
    averageTileConfidence(analysis) >= minTileConfidence &&
    !analysis.centerMismatch &&
    !hasCriticalQualityWarning(analysis)
  )
}

function averageAnalysisMovement(
  previousAnalysis: AnalyzeScanFaceResponse,
  nextAnalysis: AnalyzeScanFaceResponse,
): number {
  const tileMovement = averageTileMovement(previousAnalysis, nextAnalysis)

  if (Number.isFinite(tileMovement)) {
    return tileMovement
  }

  return Number.POSITIVE_INFINITY
}

function averageTileMovement(
  previousAnalysis: AnalyzeScanFaceResponse,
  nextAnalysis: AnalyzeScanFaceResponse,
): number {
  const previousBoxes = tileBoxesByIndex(previousAnalysis)
  const nextBoxes = tileBoxesByIndex(nextAnalysis)
  const sharedIndexes = [...previousBoxes.keys()].filter((index) => nextBoxes.has(index))

  if (sharedIndexes.length < minTileDetections) {
    return Number.POSITIVE_INFINITY
  }

  const total = sharedIndexes.reduce(
    (sum, index) => sum + boxMovement(previousBoxes.get(index)!, nextBoxes.get(index)!),
    0,
  )

  return total / sharedIndexes.length
}

function tileBoxesByIndex(analysis: AnalyzeScanFaceResponse): Map<number, ScanDetectionBox> {
  const assignedTiles = tileAssignmentFromAnalysis(analysis)
  return new Map((assignedTiles ?? []).map((tile) => [tile.index, tile.bbox]))
}

function boxMovement(previousBox: ScanDetectionBox, nextBox: ScanDetectionBox): number {
  return Math.hypot(previousBox.x - nextBox.x, previousBox.y - nextBox.y)
}

function hasCriticalQualityWarning(analysis: AnalyzeScanFaceResponse): boolean {
  return [...analysis.qualityWarnings, ...analysis.warnings].some((warning) =>
    criticalQualityWarnings.has(warning),
  )
}

function averageTileConfidence(analysis: AnalyzeScanFaceResponse): number {
  const assignedTiles = tileAssignmentFromAnalysis(analysis)!
  return assignedTiles.reduce((sum, tile) => sum + tile.confidence, 0) / assignedTiles.length
}
