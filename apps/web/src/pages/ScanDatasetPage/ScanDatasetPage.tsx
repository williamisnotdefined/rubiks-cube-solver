import { useEffect, useMemo, useRef, useState } from 'react'
import { useAnalyzeScanFace, type AnalyzeScanFaceResponse } from '@api/scan'
import type { ScanFaceSymbol } from '@api/solver/types'
import { Button } from '@components/Button'
import { Loader3x3 } from '@components/Loader3x3'
import { ScanCameraFrame } from '../SolvePage/ScanCameraFrame'
import { ScanFaceColorEditor } from '../SolvePage/ScanFaceColorEditor'
import { captureScanImage, type CapturedScanImage } from '../SolvePage/scanCapture'
import {
  createEmptyScanStickers,
  expectedTopForScanFace,
  isScanFaceComplete,
  replaceScanSticker,
  scanFaceOrder,
  scanStickersFromAnalysis,
  scanSymbolDetails,
  type ScanCaptureMetadata,
  type ScanSticker,
} from '../SolvePage/scanState'
import { useCameraStream } from '../SolvePage/hooks/useCameraStream'
import {
  buildScanDatasetExport,
  datasetStickersFromScanStickers,
  downloadScanDatasetExport,
  manualCorrectionsFromStickers,
  type ScanDatasetCaptureCondition,
  type ScanDatasetFaceSample,
  type ScanDatasetMode,
  type ScanDatasetSession,
} from './scanDatasetExport'

type FaceDraft = {
  analysis?: AnalyzeScanFaceResponse
  capture?: ScanCaptureMetadata
  photoDataUrl?: string
  stickers: ScanSticker[]
}

const lightingOptions = ['good', 'shadow', 'glare', 'low_light', 'mixed']
const backgroundOptions = ['dark', 'light', 'mixed']

export function ScanDatasetPage() {
  const analyzeScanFace = useAnalyzeScanFace()
  const camera = useCameraStream(true)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [currentFaceIndex, setCurrentFaceIndex] = useState(0)
  const [capturing, setCapturing] = useState(false)
  const [message, setMessage] = useState<string | undefined>()
  const [sessions, setSessions] = useState<ScanDatasetSession[]>(() => [createDatasetSession()])
  const activeSession = sessions[sessions.length - 1]
  const currentFace = scanFaceOrder[currentFaceIndex]
  const [draft, setDraft] = useState<FaceDraft>(() => createFaceDraft(currentFace.symbol))
  const cameraStream = camera.status === 'ready' ? camera.stream : undefined
  const sessionFaceSymbols = new Set(activeSession.faces.map((face) => face.face))
  const exportableSessions = sessions.filter((session) => session.faces.length > 0)
  const totalPhotos = sessions.reduce((count, session) => count + session.faces.length, 0)
  const completedSessions = sessions.filter((session) => session.faces.length === scanFaceOrder.length).length
  const labeledStickers = sessions.reduce(
    (count, session) => count + session.faces.reduce((faceCount, face) => faceCount + face.label.length, 0),
    0,
  )
  const label = useMemo(
    () => labelFromDraft(activeSession.mode, currentFace.symbol, draft.stickers),
    [activeSession.mode, currentFace.symbol, draft.stickers],
  )

  useEffect(() => {
    if (cameraStream === undefined || videoRef.current === null) {
      return
    }

    videoRef.current.srcObject = cameraStream
    void videoRef.current.play().catch(() => undefined)
  }, [cameraStream, currentFaceIndex, draft.photoDataUrl])

  function updateActiveSession(patch: Partial<ScanDatasetSession>) {
    setSessions((currentSessions) =>
      currentSessions.map((session, index) =>
        index === currentSessions.length - 1 ? { ...session, ...patch } : session,
      ),
    )
  }

  function updateCaptureCondition(patch: Partial<ScanDatasetCaptureCondition>) {
    updateActiveSession({
      captureCondition: { ...activeSession.captureCondition, ...patch },
    })
  }

  function handleFaceChange(index: number) {
    const nextFace = scanFaceOrder[index]
    const existingSample = activeSession.faces.find((face) => face.face === nextFace.symbol)
    setCurrentFaceIndex(index)
    setDraft(existingSample === undefined ? createFaceDraft(nextFace.symbol) : draftFromSample(existingSample))
    setMessage(undefined)
  }

  async function handleTakePhoto() {
    if (camera.status !== 'ready' || videoRef.current === null) {
      setMessage('Camera is not ready yet.')
      return
    }

    setCapturing(true)
    setMessage('Capturing and analyzing face...')

    try {
      const capture = await captureScanImage(videoRef.current, camera.stream)
      if (capture === undefined) {
        setMessage('Could not capture a camera frame.')
        return
      }

      const analysis = await analyzeScanFace.mutateAsync({
        expectedCenter: currentFace.symbol,
        image: capture.photoDataUrl,
        knownCenters: {},
      })
      setDraft({
        analysis,
        capture: captureMetadata(capture),
        photoDataUrl: capture.photoDataUrl,
        stickers: scanStickersFromAnalysis(analysis, currentFace.symbol),
      })
      setMessage(scanDatasetAnalysisMessage(analysis))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Scan analysis failed.')
    } finally {
      setCapturing(false)
    }
  }

  function handleStickerColorChange(index: number, symbol: ScanFaceSymbol) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      stickers: replaceScanSticker(currentDraft.stickers, index, symbol),
    }))
  }

  function handleAcceptSample() {
    if (draft.photoDataUrl === undefined || draft.capture === undefined) {
      setMessage('Take a photo before accepting this face sample.')
      return
    }

    if (label === undefined) {
      setMessage('Complete all 9 sticker labels before accepting this manual sample.')
      return
    }

    const sample: ScanDatasetFaceSample = {
      acceptedAt: new Date().toISOString(),
      capture: draft.capture,
      expectedTop: expectedTopForScanFace(currentFace.symbol),
      face: currentFace.symbol,
      label,
      manualCorrections: manualCorrectionsFromStickers(draft.stickers),
      photoDataUrl: draft.photoDataUrl,
      stickers: datasetStickersFromScanStickers(draft.stickers),
      visionAnalysis: draft.analysis,
    }
    const nextFaces = replaceFaceSample(activeSession.faces, sample)
    const complete = nextFaces.length === scanFaceOrder.length

    updateActiveSession({
      completedAt: complete ? new Date().toISOString() : undefined,
      faces: nextFaces,
    })

    const nextFaceIndex = nextMissingFaceIndex(nextFaces, currentFaceIndex)
    if (nextFaceIndex !== undefined) {
      const nextFace = scanFaceOrder[nextFaceIndex]
      setCurrentFaceIndex(nextFaceIndex)
      setDraft(createFaceDraft(nextFace.symbol))
    }

    setMessage(
      complete
        ? 'Dataset session complete. Export it or start the next session.'
        : 'Face sample accepted.',
    )
  }

  function handleStartNextSession() {
    setSessions((currentSessions) => [
      ...currentSessions,
      createDatasetSession({
        background: activeSession.captureCondition.background,
        cubeId: activeSession.cubeId,
        lighting: activeSession.captureCondition.lighting,
        mode: activeSession.mode,
      }),
    ])
    setCurrentFaceIndex(0)
    setDraft(createFaceDraft('F'))
    setMessage('Started a new dataset session.')
  }

  function handleExportDataset() {
    if (exportableSessions.length === 0) {
      setMessage('Capture at least one face sample before exporting.')
      return
    }

    const filename = downloadScanDatasetExport(buildScanDatasetExport({ sessions }))
    setMessage(`Exported ${filename}. Keep it out of git.`)
  }

  return (
    <main className="min-h-screen bg-[#070707] px-3 py-4 text-[#f7f7f7] sm:px-5 sm:py-6">
      <section className="mx-auto grid w-full max-w-5xl gap-4">
        <header className="grid gap-2 border border-[#2b2b2b] bg-[#101010] p-4">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#a8a8a8]">
            Dev scan dataset lab
          </p>
          <h1 className="text-2xl font-black uppercase tracking-[0.14em]">Collect scanner training data</h1>
          <p className="max-w-3xl text-sm font-semibold leading-relaxed text-[#a8a8a8]">
            Capture real cube faces, correct labels, and export a local JSON batch for evaluation and backend CNN training.
          </p>
        </header>

        <section className="grid gap-3 border border-[#2b2b2b] bg-[#101010] p-4 lg:grid-cols-5">
          <label className="grid gap-1 text-xs font-extrabold uppercase tracking-[0.16em] text-[#a8a8a8]">
            Cube ID
            <input
              className="border border-[#2b2b2b] bg-[#070707] px-3 py-2 text-sm font-bold text-[#f7f7f7]"
              value={activeSession.cubeId}
              onChange={(event) => updateActiveSession({ cubeId: event.target.value })}
            />
          </label>
          <label className="grid gap-1 text-xs font-extrabold uppercase tracking-[0.16em] text-[#a8a8a8]">
            Mode
            <select
              className="border border-[#2b2b2b] bg-[#070707] px-3 py-2 text-sm font-bold text-[#f7f7f7]"
              value={activeSession.mode}
              onChange={(event) => updateActiveSession({ mode: event.target.value as ScanDatasetMode })}
            >
              <option value="manual_label">Manual label</option>
              <option value="solved_calibration">Solved calibration</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-extrabold uppercase tracking-[0.16em] text-[#a8a8a8]">
            Lighting
            <select
              className="border border-[#2b2b2b] bg-[#070707] px-3 py-2 text-sm font-bold text-[#f7f7f7]"
              value={activeSession.captureCondition.lighting}
              onChange={(event) => updateCaptureCondition({ lighting: event.target.value })}
            >
              {lightingOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-extrabold uppercase tracking-[0.16em] text-[#a8a8a8]">
            Background
            <select
              className="border border-[#2b2b2b] bg-[#070707] px-3 py-2 text-sm font-bold text-[#f7f7f7]"
              value={activeSession.captureCondition.background}
              onChange={(event) => updateCaptureCondition({ background: event.target.value })}
            >
              {backgroundOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-extrabold uppercase tracking-[0.16em] text-[#a8a8a8]">
            Notes
            <input
              className="border border-[#2b2b2b] bg-[#070707] px-3 py-2 text-sm font-bold text-[#f7f7f7]"
              value={activeSession.captureCondition.notes}
              onChange={(event) => updateCaptureCondition({ notes: event.target.value })}
            />
          </label>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
          <div className="grid gap-3 border border-[#2b2b2b] bg-[#101010] p-4">
            <div className="flex flex-wrap gap-2">
              {scanFaceOrder.map((face, index) => {
                const details = scanSymbolDetails[face.symbol]
                return (
                  <Button
                    className="min-h-10 px-3 py-2"
                    key={face.symbol}
                    type="button"
                    variant={index === currentFaceIndex ? 'primary' : 'ghost'}
                    onClick={() => handleFaceChange(index)}
                  >
                    <span className="size-3 border border-[#2b2b2b]" style={{ backgroundColor: details.background }} />
                    {face.symbol}{sessionFaceSymbols.has(face.symbol) ? ' saved' : ''}
                  </Button>
                )
              })}
            </div>

            <ScanCameraFrame
              cameraMessage={camera.status === 'error' ? camera.message : undefined}
              cameraStatus={camera.status}
              centerMismatch={draft.analysis?.centerMismatch}
              detectionMode={draft.analysis?.detectionMode}
              faceQuad={draft.analysis?.faceQuad}
              faceConfidence={draft.analysis?.faceConfidence}
              photoDataUrl={draft.photoDataUrl}
              stickerPolygons={draft.analysis?.stickers}
              videoRef={videoRef}
            />

            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={capturing || camera.status !== 'ready'} onClick={() => void handleTakePhoto()}>
                {capturing ? <Loader3x3 decorative className="size-8" registerDelayMs={150} /> : 'Take photo'}
              </Button>
              <Button type="button" variant="secondary" disabled={capturing} onClick={handleAcceptSample}>
                Accept face sample
              </Button>
              <Button type="button" variant="ghost" onClick={handleStartNextSession}>
                Start next session
              </Button>
              <Button type="button" variant="ghost" onClick={handleExportDataset}>
                Export dataset batch
              </Button>
            </div>
          </div>

          <aside className="grid content-start gap-4 border border-[#2b2b2b] bg-[#101010] p-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#a8a8a8]">Current face</p>
              <h2 className="mt-1 text-xl font-black uppercase tracking-[0.12em]">
                {currentFace.label} / {currentFace.symbol}
              </h2>
              <p className="mt-1 text-sm font-semibold text-[#a8a8a8]">
                Keep {currentFace.topLabel} at top. Expected top: {expectedTopForScanFace(currentFace.symbol)}.
              </p>
            </div>

            <ScanFaceColorEditor
              centerSymbol={currentFace.symbol}
              stickers={draft.stickers}
              onStickerColorChange={handleStickerColorChange}
            />

            <div className="grid gap-2 border border-[#2b2b2b] bg-[#171717] p-3 text-sm font-semibold text-[#a8a8a8]">
              <span>Label: {label ?? 'incomplete'}</span>
              <span>Photos: {totalPhotos}</span>
              <span>Complete sessions: {completedSessions}</span>
              <span>Labeled stickers: {labeledStickers}</span>
            </div>
            <p className="min-h-10 text-sm font-semibold leading-relaxed text-[#a8a8a8]" aria-live="polite">
              {message ?? 'Capture a face, correct labels, then accept the sample.'}
            </p>
          </aside>
        </section>
      </section>
    </main>
  )
}

function createDatasetSession(options: {
  background?: string
  cubeId?: string
  lighting?: string
  mode?: ScanDatasetMode
} = {}): ScanDatasetSession {
  const now = new Date().toISOString()
  return {
    captureCondition: {
      background: options.background ?? 'dark',
      lighting: options.lighting ?? 'good',
      notes: '',
    },
    cubeId: options.cubeId ?? 'cube_a',
    faces: [],
    mode: options.mode ?? 'manual_label',
    sessionId: `scan-dataset-${now}`,
    startedAt: now,
  }
}

function createFaceDraft(symbol: ScanFaceSymbol): FaceDraft {
  return { stickers: createEmptyScanStickers(symbol) }
}

function captureMetadata(capture: CapturedScanImage): ScanCaptureMetadata {
  return {
    capturedAt: capture.capturedAt,
    height: capture.height,
    source: capture.source,
    width: capture.width,
  }
}

function labelFromDraft(
  mode: ScanDatasetMode,
  face: ScanFaceSymbol,
  stickers: readonly ScanSticker[],
): string | undefined {
  if (mode === 'solved_calibration') {
    return face.repeat(9)
  }

  if (!isScanFaceComplete(stickers)) {
    return undefined
  }

  return stickers.map((sticker) => sticker.symbol).join('')
}

function draftFromSample(sample: ScanDatasetFaceSample): FaceDraft {
  return {
    analysis: sample.visionAnalysis,
    capture: sample.capture,
    photoDataUrl: sample.photoDataUrl,
    stickers: sample.stickers,
  }
}

function replaceFaceSample(
  samples: readonly ScanDatasetFaceSample[],
  sample: ScanDatasetFaceSample,
): ScanDatasetFaceSample[] {
  return [...samples.filter((faceSample) => faceSample.face !== sample.face), sample]
}

function nextMissingFaceIndex(
  samples: readonly ScanDatasetFaceSample[],
  currentFaceIndex: number,
): number | undefined {
  const savedFaces = new Set(samples.map((sample) => sample.face))

  for (let offset = 1; offset <= scanFaceOrder.length; offset += 1) {
    const index = (currentFaceIndex + offset) % scanFaceOrder.length
    if (!savedFaces.has(scanFaceOrder[index].symbol)) {
      return index
    }
  }

  return undefined
}

function scanDatasetAnalysisMessage(analysis: AnalyzeScanFaceResponse): string {
  if (analysis.centerMismatch) {
    return 'Captured and analyzed. Center mismatch is stored as evidence; correct the label if needed.'
  }

  if (analysis.stickers.length !== 9) {
    return 'Captured, but Vision did not return all stickers. Manual labels can still be exported.'
  }

  return 'Captured and analyzed. Review the label before accepting.'
}
