import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useAnalyzeScanFace, type AnalyzeScanFaceResponse, type RgbColor } from '@api/scan'
import type { ScanFaceSymbol, ScanFacesPayload, SolveResult } from '@api/solver/types'
import { Button } from '@components/Button'
import { Loader3x3 } from '@components/Loader3x3'
import { captureScanImage } from './scanCapture'
import { ScanCameraFrame } from './ScanCameraFrame'
import { ScanFaceColorEditor } from './ScanFaceColorEditor'
import { ScanSolveSettingsModal } from './ScanSolveSettingsModal'
import {
  confirmedFaceCount,
  countScanSymbols,
  createEmptyScanStickers,
  lowConfidenceCount,
  replaceScanSticker,
  scanFaceOrder,
  scanFacesToPayload,
  scanSymbolDetails,
  scanSymbols,
  validateScanFaceDraft,
  type ScanFaces,
  type ScanSticker,
} from './scanState'
import { useCameraStream } from './hooks/useCameraStream'
import { useLiveScanPreview } from './hooks/useLiveScanPreview'

type ScanCubeModalProps = {
  apiReady: boolean
  solveDisabledReason?: string
  solving: boolean
  onClose: () => void
  onSolve: (faces: ScanFacesPayload) => Promise<SolveResult | undefined>
}

type SolveFailure = Exclude<SolveResult, { ok: true }>
type SolveLimitsFailure = SolveFailure & {
  status: 'not_found_within_limits' | 'invalid_limits'
}

export function ScanCubeModal({
  apiReady,
  solveDisabledReason,
  solving,
  onClose,
  onSolve,
}: ScanCubeModalProps) {
  const titleId = useId()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const takePhotoRef = useRef<((source?: 'auto' | 'manual') => Promise<void>) | undefined>(undefined)
  const camera = useCameraStream(true)
  const analyzeScanFace = useAnalyzeScanFace()
  const [faces, setFaces] = useState<ScanFaces>({})
  const [currentFaceIndex, setCurrentFaceIndex] = useState(0)
  const currentFace = scanFaceOrder[currentFaceIndex]
  const [stickers, setStickers] = useState<ScanSticker[]>(() =>
    createEmptyScanStickers(currentFace.symbol),
  )
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>()
  const [scanAnalysis, setScanAnalysis] = useState<AnalyzeScanFaceResponse | undefined>()
  const [autoScanEnabled, setAutoScanEnabled] = useState(true)
  const [capturing, setCapturing] = useState(false)
  const [limitsFailureResult, setLimitsFailureResult] = useState<SolveLimitsFailure | undefined>()
  const [message, setMessage] = useState<string | undefined>()
  const completePayload = scanFacesToPayload(faces)
  const draftValidation = validateScanFaceDraft(faces, currentFace.symbol, stickers)
  const centerValidation = scanAnalysis?.centerMismatch
    ? centerMismatchMessage(scanAnalysis)
    : undefined
  const faceValidation = centerValidation ?? draftValidation
  const previewFaces: ScanFaces = {
    ...faces,
    [currentFace.symbol]: { symbol: currentFace.symbol, stickers },
  }
  const previewCounts = countScanSymbols(previewFaces)
  const knownCenters = useMemo(() => knownCenterReferencesFromFaces(faces), [faces])
  const liveScan = useLiveScanPreview({
    enabled: autoScanEnabled && photoDataUrl === undefined && camera.status === 'ready' && !capturing,
    expectedCenter: currentFace.symbol,
    knownCenters,
    videoRef,
  })
  const {
    latestAnalysis: liveAnalysis,
    message: liveMessage,
    resetAutoCapture: resetLiveAutoCapture,
    shouldAutoCapture,
    stableFrameCount: liveStableFrameCount,
    status: liveStatus,
  } = liveScan
  const cameraAnalysis = photoDataUrl === undefined ? liveAnalysis : scanAnalysis
  const liveDetectedAnalysis =
    photoDataUrl === undefined && cameraAnalysis?.detectionMode === 'guide_fallback'
      ? undefined
      : cameraAnalysis
  const scannerMessage =
    photoDataUrl === undefined
      ? autoScanEnabled
        ? liveMessage
        : 'Auto scan paused. Use Take photo when the face is visible.'
      : faceValidation
  const canClearPhoto =
    photoDataUrl !== undefined ||
    scanAnalysis !== undefined ||
    stickers.some((sticker, index) => index !== 4 && sticker.symbol !== undefined)

  useEffect(() => {
    const face = faces[currentFace.symbol]
    setStickers(face?.stickers ?? createEmptyScanStickers(currentFace.symbol))
    setPhotoDataUrl(face?.photoDataUrl)
    setScanAnalysis(undefined)
    setMessage(undefined)
  }, [currentFace.symbol, faces])

  useEffect(() => {
    if (camera.status !== 'ready' || videoRef.current === null) {
      return
    }

    videoRef.current.srcObject = camera.stream
    void videoRef.current.play().catch(() => undefined)
  }, [camera])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    if (!shouldAutoCapture || capturing || photoDataUrl !== undefined) {
      return
    }

    resetLiveAutoCapture()
    void takePhotoRef.current?.('auto')
  }, [capturing, photoDataUrl, resetLiveAutoCapture, shouldAutoCapture])

  async function handleTakePhoto(source: 'auto' | 'manual' = 'manual') {
    if (videoRef.current === null || camera.status !== 'ready') {
      setMessage('Camera is not ready yet.')
      return
    }

    resetLiveAutoCapture()
    setCapturing(true)
    setScanAnalysis(undefined)
    setMessage(source === 'auto' ? 'Auto-capturing stable face...' : 'Capturing photo...')

    try {
      const capture = captureScanImage(videoRef.current)
      if (capture === undefined) {
        setMessage('Could not read a camera frame. Try again.')
        return
      }

      setMessage('Analyzing cube face...')

      const analysis = await analyzeScanFace.mutateAsync({
        expectedCenter: currentFace.symbol,
        image: capture.photoDataUrl,
        knownCenters,
      })
      setScanAnalysis(analysis)

      if (analysis.stickers.length === 0 || isGuideFallbackAnalysis(analysis)) {
        setStickers(createEmptyScanStickers(currentFace.symbol))
        setMessage(
          isGuideFallbackAnalysis(analysis)
            ? 'Still looking for the cube face. Keep the full face visible and let auto scan try again.'
            : analysis.message ?? 'Could not detect a cube face. Retake the photo or fill the grid manually.',
        )
        return
      }

      setPhotoDataUrl(capture.photoDataUrl)
      const nextStickers = scanStickersFromAnalysis(analysis, currentFace.symbol)
      setStickers(nextStickers)
      const uncertain = lowConfidenceCount(nextStickers)
      const centerMessage = analysis.centerMismatch ? centerMismatchMessage(analysis) : undefined
      const qualityMessage = scanQualityMessage(analysis)
      const captureMessage =
        source === 'auto'
          ? 'Captured automatically. Review the colors before confirming this face.'
          : 'Photo captured. Review the colors before confirming this face.'
      const detectionMessage =
        uncertain > 0
          ? `${uncertain} detected colors are uncertain. Review the highlighted squares or retake the photo.`
          : captureMessage
      setMessage(
        [centerMessage, qualityMessage, detectionMessage].filter(Boolean).join(' '),
      )
    } catch (error) {
      setStickers(createEmptyScanStickers(currentFace.symbol))
      setMessage(error instanceof Error ? error.message : 'The scan analysis request failed.')
    } finally {
      setCapturing(false)
    }
  }

  takePhotoRef.current = handleTakePhoto

  function handleStickerColorChange(index: number, symbol: ScanSticker['symbol']) {
    if (symbol === undefined) {
      return
    }

    setStickers((currentStickers) =>
      replaceScanSticker(currentStickers, index, index === 4 ? currentFace.symbol : symbol),
    )
  }

  function handleClearPhoto() {
    setFaces((currentFaces) => {
      const nextFaces = { ...currentFaces }
      delete nextFaces[currentFace.symbol]

      return nextFaces
    })
    setStickers(createEmptyScanStickers(currentFace.symbol))
    setPhotoDataUrl(undefined)
    setScanAnalysis(undefined)
    setMessage(undefined)
    resetLiveAutoCapture()
    analyzeScanFace.reset()
  }

  function handleAutoScanToggle() {
    setAutoScanEnabled((enabled) => !enabled)
    resetLiveAutoCapture()
    setMessage(undefined)
  }

  function handleConfirmFace() {
    if (centerValidation !== undefined) {
      setMessage(centerValidation)
      return
    }

    if (draftValidation !== undefined) {
      setMessage(draftValidation)
      return
    }

    const nextFaces: ScanFaces = {
      ...faces,
      [currentFace.symbol]: {
        symbol: currentFace.symbol,
        stickers,
        photoDataUrl,
      },
    }

    setFaces(nextFaces)
    if (currentFaceIndex < scanFaceOrder.length - 1) {
      setCurrentFaceIndex((index) => index + 1)
      return
    }

    setMessage('All faces are confirmed. Solve the scanned cube when ready.')
  }

  async function handleSolveScan() {
    const payload = scanFacesToPayload(faces)
    if (payload === undefined) {
      setMessage('Confirm all six faces and make sure each color appears exactly 9 times.')
      return
    }

    if (!apiReady) {
      setMessage('The API is not ready yet.')
      return
    }

    if (solveDisabledReason !== undefined) {
      setMessage(solveDisabledReason)
      return
    }

    await solveScanPayload(payload)
  }

  async function handleRetrySolveScan() {
    const payload = scanFacesToPayload(faces)
    if (payload === undefined) {
      setLimitsFailureResult(undefined)
      setMessage('Confirm all six faces and make sure each color appears exactly 9 times.')
      return
    }

    if (!apiReady) {
      setMessage('The API is not ready yet.')
      return
    }

    if (solveDisabledReason !== undefined) {
      setMessage(solveDisabledReason)
      return
    }

    await solveScanPayload(payload)
  }

  async function solveScanPayload(payload: ScanFacesPayload) {
    try {
      setLimitsFailureResult(undefined)
      const result = await onSolve(payload)
      if (result?.ok) {
        onClose()
        return
      }

      if (isSolveLimitsFailure(result)) {
        setLimitsFailureResult(result)
        setMessage(result.message)
        return
      }

      setMessage(result?.message ?? 'The scanned cube was rejected. Review the confirmed colors.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The scan solve request failed.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-3 py-6 sm:px-6">
      <button
        aria-label="Dismiss scan cube"
        className="absolute inset-0 bg-[#070707]/90"
        type="button"
        onClick={onClose}
      />
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="relative max-h-[calc(100vh-3rem)] w-full max-w-4xl overflow-auto border border-[#2b2b2b] bg-[#101010] p-4 text-left text-[#f7f7f7] shadow-2xl sm:p-6"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-1">
            <h2 className="text-lg font-extrabold uppercase tracking-[0.16em]" id={titleId}>
              Scan cube
            </h2>
            <p className="text-sm font-semibold text-[#a8a8a8]">
              Capture one face at a time with the requested top color. The solution uses the colors you confirm.
            </p>
          </div>
          <Button className="min-h-10 px-4 py-2" type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
          <div className="grid gap-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#a8a8a8]">
                  Face {currentFaceIndex + 1} of {scanFaceOrder.length}
                </p>
                <h3 className="mt-1 text-xl font-extrabold">{currentFace.label}</h3>
                <p className="mt-1 text-sm font-semibold leading-relaxed text-[#a8a8a8]">
                  {currentFace.instruction}
                </p>
                <p className="mt-1 text-xs font-extrabold uppercase tracking-[0.16em] text-[#f7f7f7]">
                  Expected center: {scanSymbolDetails[currentFace.symbol].label}
                </p>
                <p className="mt-1 text-xs font-extrabold uppercase tracking-[0.16em] text-[#f7f7f7]">
                  Keep at top: {currentFace.topLabel}
                </p>
              </div>
              <span className="border border-[#2b2b2b] bg-[#171717] px-3 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#a8a8a8]">
                {confirmedFaceCount(faces)} confirmed
              </span>
            </div>

            <ScanCameraFrame
              cameraMessage={camera.status === 'error' ? camera.message : undefined}
              cameraStatus={camera.status}
              centerMismatch={liveDetectedAnalysis?.centerMismatch}
              detectionMode={cameraAnalysis?.detectionMode}
              faceQuad={liveDetectedAnalysis?.faceQuad}
              faceConfidence={cameraAnalysis?.faceConfidence}
              photoDataUrl={photoDataUrl}
              stableFrameCount={liveStableFrameCount}
              stickerPolygons={liveDetectedAnalysis?.stickers}
              trackingStatus={liveStatus}
              videoRef={videoRef}
            />

            <div className="flex flex-wrap gap-2">
              <Button
                className="min-h-10 px-4 py-2"
                type="button"
                variant="ghost"
                aria-pressed={autoScanEnabled}
                disabled={photoDataUrl !== undefined || capturing || camera.status !== 'ready'}
                onClick={handleAutoScanToggle}
              >
                {autoScanEnabled ? 'Auto scan on' : 'Auto scan off'}
              </Button>
              <Button
                className="min-h-10 px-4 py-2"
                type="button"
                variant="secondary"
                disabled={camera.status !== 'ready' || capturing}
                onClick={() => void handleTakePhoto('manual')}
              >
                {capturing ? 'Analyzing' : photoDataUrl === undefined ? 'Take photo' : 'Retake photo'}
              </Button>
              <Button
                className="min-h-10 px-4 py-2"
                type="button"
                variant="ghost"
                disabled={!canClearPhoto || capturing}
                onClick={handleClearPhoto}
              >
                Clear photo
              </Button>
              <Button
                className="min-h-10 px-4 py-2"
                type="button"
                variant="secondary"
                disabled={faceValidation !== undefined}
                onClick={handleConfirmFace}
              >
                Confirm face
              </Button>
            </div>
          </div>

          <div className="grid content-start gap-4">
            <ScanFaceColorEditor
              centerSymbol={currentFace.symbol}
              key={currentFace.symbol}
              stickers={stickers}
              onStickerColorChange={handleStickerColorChange}
            />
            <div className="grid gap-2 border border-[#2b2b2b] bg-[#171717] p-3 text-sm font-semibold text-[#a8a8a8]">
              <span className="text-xs font-extrabold uppercase tracking-[0.16em]">Color count</span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {scanSymbols.map((symbol) => {
                  const details = scanSymbolDetails[symbol]

                  return (
                    <span className="flex items-center gap-2" key={symbol}>
                      <span
                        className="size-3 border border-[#2b2b2b]"
                        style={{ backgroundColor: details.background }}
                      />
                      {details.label}: {previewCounts[symbol]}/9
                    </span>
                  )
                })}
              </div>
            </div>
            <p className="min-h-10 text-sm font-semibold leading-relaxed text-[#a8a8a8]" aria-live="polite">
              {message ??
                solveDisabledReason ??
                scannerMessage ??
                'Select a square, then pick a color to correct it.'}
            </p>
            <Button
              aria-label={solving ? 'Loading' : undefined}
              type="button"
              disabled={
                completePayload === undefined || !apiReady || solving || solveDisabledReason !== undefined
              }
              onClick={handleSolveScan}
            >
              {solving ? <Loader3x3 decorative className="size-8" registerDelayMs={150} /> : 'Solve scanned cube'}
            </Button>
          </div>
        </div>
      </section>
      {limitsFailureResult === undefined ? null : (
        <ScanSolveSettingsModal
          result={limitsFailureResult}
          solving={solving}
          onClose={() => setLimitsFailureResult(undefined)}
          onRetry={handleRetrySolveScan}
        />
      )}
    </div>
  )
}

function isSolveLimitsFailure(result: SolveResult | undefined): result is SolveLimitsFailure {
  return (
    result?.ok === false &&
    (result.status === 'not_found_within_limits' || result.status === 'invalid_limits')
  )
}

function isGuideFallbackAnalysis(analysis: AnalyzeScanFaceResponse): boolean {
  return analysis.detectionMode === 'guide_fallback' || analysis.detectionMode === 'rejected'
}

function centerMismatchMessage(analysis: AnalyzeScanFaceResponse): string {
  const detectedSymbol = analysis.detectedCenter
  const expectedSymbol = analysis.expectedCenter
  const confidence =
    analysis.detectedCenterConfidence > 0
      ? ` (${Math.round(analysis.detectedCenterConfidence * 100)}% confidence)`
      : ''

  if (detectedSymbol === undefined || expectedSymbol === undefined) {
    return analysis.message ?? 'Captured center does not match this scan step. Retake the photo.'
  }

  return `Center looks ${scanSymbolDetails[detectedSymbol].label}${confidence}, but this step expects ${scanSymbolDetails[expectedSymbol].label}. Rotate to the expected face and retake the photo before confirming.`
}

function scanQualityMessage(analysis: AnalyzeScanFaceResponse): string | undefined {
  const warnings = new Set([...(analysis.qualityWarnings ?? []), ...(analysis.warnings ?? [])])
  const messages: string[] = []

  if (analysis.detectionMode === 'guide_fallback') {
    messages.push('The face outline was weak; keep the cube flat inside the guide.')
  }

  if (analysis.faceConfidence > 0 && analysis.faceConfidence < 0.55) {
    messages.push('Detection confidence is low.')
  }

  if (warnings.has('image_blurry')) {
    messages.push('Hold the cube steady for a sharper photo.')
  }

  if (warnings.has('image_too_dark')) {
    messages.push('Add more light before scanning.')
  }

  if (warnings.has('image_too_bright')) {
    messages.push('Reduce glare before scanning.')
  }

  if (messages.length > 0) {
    return messages.join(' ')
  }

  return analysis.status === 'low_confidence' ? analysis.message : undefined
}

function knownCenterReferencesFromFaces(faces: ScanFaces): Partial<Record<ScanFaceSymbol, RgbColor>> {
  const references: Partial<Record<ScanFaceSymbol, RgbColor>> = {}

  for (const face of Object.values(faces)) {
    const center = face?.stickers[4]
    if (face !== undefined && center?.rgb !== undefined) {
      references[face.symbol] = center.rgb
    }
  }

  return references
}

function scanStickersFromAnalysis(
  analysis: AnalyzeScanFaceResponse,
  centerSymbol: ScanFaceSymbol,
): ScanSticker[] {
  const stickers = createEmptyScanStickers(centerSymbol)

  for (const analyzedSticker of analysis.stickers) {
    if (analyzedSticker.index < 0 || analyzedSticker.index > 8) {
      continue
    }

    stickers[analyzedSticker.index] = {
      alternatives: analyzedSticker.alternatives,
      confidence:
        analyzedSticker.index === 4
          ? analysis.detectedCenterConfidence || analysis.confidence
          : analyzedSticker.confidence,
      rgb: analyzedSticker.rgb,
      source: analyzedSticker.index === 4 ? 'center' : 'detected',
      symbol: analyzedSticker.index === 4 ? centerSymbol : analyzedSticker.symbol,
    }
  }

  return stickers
}
