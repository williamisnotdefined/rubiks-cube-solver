import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useAnalyzeScanFace, type AnalyzeScanFaceResponse, type RgbColor } from '@api/scan'
import type { ScanFaceSymbol, ScanFacesPayload, SolveResult } from '@api/solver/types'
import { Button } from '@components/Button'
import { captureScanImage } from './scanCapture'
import { ScanCameraFrame } from './ScanCameraFrame'
import { ScanFaceColorEditor } from './ScanFaceColorEditor'
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

type ScanCubeModalProps = {
  apiReady: boolean
  solveDisabledReason?: string
  solving: boolean
  onClose: () => void
  onSolve: (faces: ScanFacesPayload) => Promise<SolveResult | undefined>
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
  const [capturing, setCapturing] = useState(false)
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

  async function handleTakePhoto() {
    if (videoRef.current === null || camera.status !== 'ready') {
      setMessage('Camera is not ready yet.')
      return
    }

    setCapturing(true)
    setScanAnalysis(undefined)
    setMessage('Capturing photo...')

    try {
      const capture = captureScanImage(videoRef.current)
      if (capture === undefined) {
        setMessage('Could not read a camera frame. Try again.')
        return
      }

      setPhotoDataUrl(capture.photoDataUrl)
      setMessage('Analyzing cube face...')

      const analysis = await analyzeScanFace.mutateAsync({
        expectedCenter: currentFace.symbol,
        image: capture.photoDataUrl,
        knownCenters,
      })
      setScanAnalysis(analysis)

      if (analysis.stickers.length === 0) {
        setStickers(createEmptyScanStickers(currentFace.symbol))
        setMessage(
          analysis.message ?? 'Could not detect a cube face. Retake the photo or fill the grid manually.',
        )
        return
      }

      const nextStickers = scanStickersFromAnalysis(analysis, currentFace.symbol)
      setStickers(nextStickers)
      const uncertain = lowConfidenceCount(nextStickers)
      const centerMessage = analysis.centerMismatch ? centerMismatchMessage(analysis) : undefined
      const detectionMessage =
        uncertain > 0
          ? `${uncertain} detected colors are uncertain. Review the highlighted squares.`
          : 'Photo captured. Review the colors before confirming this face.'
      setMessage(
        centerMessage === undefined ? detectionMessage : `${centerMessage} ${detectionMessage}`,
      )
    } catch (error) {
      setStickers(createEmptyScanStickers(currentFace.symbol))
      setMessage(error instanceof Error ? error.message : 'The scan analysis request failed.')
    } finally {
      setCapturing(false)
    }
  }

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
    analyzeScanFace.reset()
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

    try {
      const result = await onSolve(payload)
      if (result?.ok) {
        onClose()
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
              Capture one face at a time. The solution uses the colors you confirm.
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
              </div>
              <span className="border border-[#2b2b2b] bg-[#171717] px-3 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#a8a8a8]">
                {confirmedFaceCount(faces)} confirmed
              </span>
            </div>

            <ScanCameraFrame
              cameraMessage={camera.status === 'error' ? camera.message : undefined}
              cameraStatus={camera.status}
              faceQuad={scanAnalysis?.faceQuad}
              photoDataUrl={photoDataUrl}
              stickerPolygons={scanAnalysis?.stickers}
              videoRef={videoRef}
            />

            <div className="flex flex-wrap gap-2">
              <Button
                className="min-h-10 px-4 py-2"
                type="button"
                variant="secondary"
                disabled={camera.status !== 'ready' || capturing}
                onClick={handleTakePhoto}
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
                faceValidation ??
                'Select a square, then pick a color to correct it.'}
            </p>
            <Button
              type="button"
              disabled={
                completePayload === undefined || !apiReady || solving || solveDisabledReason !== undefined
              }
              onClick={handleSolveScan}
            >
              {solving ? 'Solving scan' : 'Solve scanned cube'}
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

function centerMismatchMessage(analysis: AnalyzeScanFaceResponse): string {
  const detectedSymbol = analysis.detectedCenter
  const expectedSymbol = analysis.expectedCenter

  if (detectedSymbol === undefined || expectedSymbol === undefined) {
    return analysis.message ?? 'Captured center does not match this scan step. Retake the photo.'
  }

  return `Center looks ${scanSymbolDetails[detectedSymbol].label}, but this step expects ${scanSymbolDetails[expectedSymbol].label}. Rotate to the expected face and retake the photo before confirming.`
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
      confidence: analyzedSticker.index === 4 ? 1 : analyzedSticker.confidence,
      rgb: analyzedSticker.rgb,
      source: analyzedSticker.index === 4 ? 'center' : 'detected',
      symbol: analyzedSticker.index === 4 ? centerSymbol : analyzedSticker.symbol,
    }
  }

  return stickers
}
