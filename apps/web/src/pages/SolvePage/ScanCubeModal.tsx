import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { ScanFacesPayload, SolveResult } from '@api/solver/types'
import { Button } from '@components/Button'
import { captureScanFrame, type ScanCenterAnalysis, type ScanColorReferences } from './scanColor'
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

function centerMismatchMessage({
  detectedSymbol,
  expectedSymbol,
}: ScanCenterAnalysis): string {
  return `Center looks ${scanSymbolDetails[detectedSymbol].label}, but this step expects ${scanSymbolDetails[expectedSymbol].label}. Rotate to the expected face or retake the photo before confirming.`
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
  const [faces, setFaces] = useState<ScanFaces>({})
  const [currentFaceIndex, setCurrentFaceIndex] = useState(0)
  const currentFace = scanFaceOrder[currentFaceIndex]
  const [stickers, setStickers] = useState<ScanSticker[]>(() =>
    createEmptyScanStickers(currentFace.symbol),
  )
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>()
  const [message, setMessage] = useState<string | undefined>()
  const completePayload = scanFacesToPayload(faces)
  const draftValidation = validateScanFaceDraft(faces, currentFace.symbol, stickers)
  const previewFaces: ScanFaces = {
    ...faces,
    [currentFace.symbol]: { symbol: currentFace.symbol, stickers },
  }
  const previewCounts = countScanSymbols(previewFaces)
  const colorReferences = useMemo<ScanColorReferences>(() => {
    const references: ScanColorReferences = {}

    for (const face of Object.values(faces)) {
      const center = face?.stickers[4]
      if (face !== undefined && center?.rgb !== undefined) {
        references[face.symbol] = center.rgb
      }
    }

    return references
  }, [faces])

  useEffect(() => {
    const face = faces[currentFace.symbol]
    setStickers(face?.stickers ?? createEmptyScanStickers(currentFace.symbol))
    setPhotoDataUrl(face?.photoDataUrl)
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

  function handleTakePhoto() {
    if (videoRef.current === null || camera.status !== 'ready') {
      setMessage('Camera is not ready yet.')
      return
    }

    const capture = captureScanFrame(videoRef.current, currentFace.symbol, colorReferences)
    if (capture === undefined) {
      setMessage('Could not read a camera frame. Try again.')
      return
    }

    setStickers(capture.stickers)
    setPhotoDataUrl(capture.photoDataUrl)
    const uncertain = lowConfidenceCount(capture.stickers)
    const centerMessage = capture.centerAnalysis.mismatched
      ? centerMismatchMessage(capture.centerAnalysis)
      : undefined
    const detectionMessage =
      uncertain > 0
        ? `${uncertain} detected colors are uncertain. Review the highlighted squares.`
        : 'Photo captured. Review the colors before confirming this face.'
    setMessage(
      centerMessage === undefined ? detectionMessage : `${centerMessage} ${detectionMessage}`,
    )
  }

  function handleStickerColorChange(index: number, symbol: ScanSticker['symbol']) {
    if (symbol === undefined) {
      return
    }

    setStickers((currentStickers) =>
      replaceScanSticker(currentStickers, index, index === 4 ? currentFace.symbol : symbol),
    )
  }

  function handleConfirmFace() {
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
              photoDataUrl={photoDataUrl}
              videoRef={videoRef}
            />

            <div className="flex flex-wrap gap-2">
              <Button
                className="min-h-10 px-4 py-2"
                type="button"
                variant="secondary"
                disabled={camera.status !== 'ready'}
                onClick={handleTakePhoto}
              >
                {photoDataUrl === undefined ? 'Take photo' : 'Retake photo'}
              </Button>
              <Button
                className="min-h-10 px-4 py-2"
                type="button"
                variant="ghost"
                disabled={currentFaceIndex === 0}
                onClick={() => setCurrentFaceIndex((index) => Math.max(0, index - 1))}
              >
                Previous
              </Button>
              <Button
                className="min-h-10 px-4 py-2"
                type="button"
                variant="secondary"
                disabled={draftValidation !== undefined}
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
                draftValidation ??
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
