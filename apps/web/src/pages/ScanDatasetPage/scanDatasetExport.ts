import type { AnalyzeScanFaceResponse } from '@api/scan'
import type { ScanFaceSymbol } from '@api/solver/types'
import type { ScanCaptureMetadata, ScanSticker } from '../SolvePage/scanState'

export const scanDatasetExportSchemaVersion = 'scan-dataset-v1'

export type ScanDatasetMode = 'manual_label' | 'solved_calibration'

export type ScanDatasetCaptureCondition = {
  background: string
  lighting: string
  notes: string
}

export type ScanDatasetSticker = {
  index: number
  symbol?: ScanFaceSymbol
  confidence: number
  source: ScanSticker['source']
  rgb?: ScanSticker['rgb']
  alternatives?: ScanSticker['alternatives']
}

export type ScanDatasetFaceSample = {
  acceptedAt: string
  capture: ScanCaptureMetadata
  expectedTop: ScanFaceSymbol
  face: ScanFaceSymbol
  label: string
  manualCorrections: Partial<Record<number, ScanFaceSymbol>>
  photoDataUrl: string
  stickers: ScanDatasetSticker[]
  visionAnalysis?: AnalyzeScanFaceResponse
}

export type ScanDatasetSession = {
  captureCondition: ScanDatasetCaptureCondition
  completedAt?: string
  cubeId: string
  faces: ScanDatasetFaceSample[]
  mode: ScanDatasetMode
  sessionId: string
  startedAt: string
}

export type ScanDatasetExportV1 = {
  schemaVersion: typeof scanDatasetExportSchemaVersion
  createdAt: string
  sessions: ScanDatasetSession[]
  source: 'web-scan-dataset-page'
}

export function buildScanDatasetExport({
  now = new Date(),
  sessions,
}: {
  now?: Date
  sessions: readonly ScanDatasetSession[]
}): ScanDatasetExportV1 {
  return {
    schemaVersion: scanDatasetExportSchemaVersion,
    createdAt: now.toISOString(),
    sessions: sessions.filter((session) => session.faces.length > 0),
    source: 'web-scan-dataset-page',
  }
}

export function downloadScanDatasetExport(exportData: ScanDatasetExportV1): string {
  const filename = `rubiks-scan-dataset-${safeTimestamp(exportData.createdAt)}.json`
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  return filename
}

export function datasetStickersFromScanStickers(
  stickers: readonly ScanSticker[],
): ScanDatasetSticker[] {
  return stickers.map((sticker, index) => ({
    alternatives: sticker.alternatives,
    confidence: sticker.confidence,
    index,
    rgb: sticker.rgb,
    source: sticker.source,
    symbol: sticker.symbol,
  }))
}

export function manualCorrectionsFromStickers(
  stickers: readonly ScanSticker[],
): Partial<Record<number, ScanFaceSymbol>> {
  const corrections: Partial<Record<number, ScanFaceSymbol>> = {}

  for (const [index, sticker] of stickers.entries()) {
    if (sticker.source === 'manual' && sticker.symbol !== undefined) {
      corrections[index] = sticker.symbol
    }
  }

  return corrections
}

function safeTimestamp(timestamp: string): string {
  return timestamp.replace(/[^0-9A-Za-z]+/g, '-').replace(/^-|-$/g, '')
}
