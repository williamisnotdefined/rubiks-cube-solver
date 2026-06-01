import type { AnalyzeScanFaceResponse, ScanSessionResult } from '@api/scan'
import type { ScanFaceSymbol } from '@api/solver/types'
import {
  expectedTopForScanFace,
  scanFaceOrder,
  type RejectedScanCapture,
  type ScanAutoCaptureMetadata,
  type ScanCaptureMetadata,
  type ScanFaceDrafts,
  type ScanSticker,
} from './scanState'
import type { TemporalFaceConsensus } from './scanTemporalConsensus'

export const scanSessionExportSchemaVersion = 'scan-session-export-v1'

export type ScanSessionExportSticker = {
  index: number
  symbol?: ScanFaceSymbol
  confidence: number
  source: ScanSticker['source']
  rgb?: ScanSticker['rgb']
  alternatives?: ScanSticker['alternatives']
}

export type ScanSessionExportFace = {
  symbol: ScanFaceSymbol
  expectedTop: ScanFaceSymbol
  autoCapture?: ScanAutoCaptureMetadata
  captureMode?: 'manual' | 'auto'
  confirmed: boolean
  centerOverrideConfirmed?: boolean
  photoDataUrl?: string
  capture?: ScanCaptureMetadata
  lastRejectedCapture?: RejectedScanCapture
  stickers: ScanSessionExportSticker[]
  manualOverrides: Partial<Record<number, ScanFaceSymbol>>
  analysis?: AnalyzeScanFaceResponse
  temporalConsensus?: TemporalFaceConsensus
}

export type ScanSessionExportLabel = {
  facelets?: string
  faces?: Partial<Record<ScanFaceSymbol, string>>
  notes?: string
  validatedBy?: string
}

export type ScanSessionExportV1 = {
  schemaVersion: typeof scanSessionExportSchemaVersion
  createdAt: string
  source: 'web-scan-modal'
  complete: boolean
  faces: ScanSessionExportFace[]
  sessionResult?: ScanSessionResult
  label?: ScanSessionExportLabel
}

export function scanExportEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_SCAN_EXPORT === 'true'
}

export function hasExportableScanSession(drafts: ScanFaceDrafts): boolean {
  return scanFaceOrder.some(
    ({ symbol }) => drafts[symbol].photoDataUrl !== undefined || drafts[symbol].lastRejectedCapture !== undefined,
  )
}

export function buildScanSessionExport({
  drafts,
  now = new Date(),
  sessionResult,
}: {
  drafts: ScanFaceDrafts
  now?: Date
  sessionResult?: ScanSessionResult
}): ScanSessionExportV1 {
  return {
    schemaVersion: scanSessionExportSchemaVersion,
    createdAt: now.toISOString(),
    source: 'web-scan-modal',
    complete: scanFaceOrder.every(({ symbol }) => drafts[symbol].confirmed && drafts[symbol].photoDataUrl !== undefined),
    faces: scanFaceOrder.map(({ symbol }) => exportFace(symbol, drafts)),
    sessionResult,
  }
}

export function downloadScanSessionExport(exportData: ScanSessionExportV1): string {
  const filename = `rubiks-scan-session-${safeTimestamp(exportData.createdAt)}.json`
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

function exportFace(symbol: ScanFaceSymbol, drafts: ScanFaceDrafts): ScanSessionExportFace {
  const draft = drafts[symbol]
  return {
    analysis: draft.analysis,
    autoCapture: draft.autoCapture,
    capture: draft.capture,
    captureMode: draft.captureMode,
    centerOverrideConfirmed: draft.centerOverrideConfirmed,
    confirmed: draft.confirmed,
    expectedTop: expectedTopForScanFace(symbol),
    lastRejectedCapture: draft.lastRejectedCapture,
    manualOverrides: manualOverridesFromDraft(draft),
    photoDataUrl: draft.photoDataUrl,
    stickers: draft.stickers.map((sticker, index) => ({
      alternatives: sticker.alternatives,
      confidence: sticker.confidence,
      index,
      rgb: sticker.rgb,
      source: sticker.source,
      symbol: sticker.symbol,
    })),
    symbol,
    temporalConsensus: draft.temporalConsensus,
  }
}

function manualOverridesFromDraft(
  draft: ScanFaceDrafts[ScanFaceSymbol],
): Partial<Record<number, ScanFaceSymbol>> {
  const overrides: Partial<Record<number, ScanFaceSymbol>> = {}

  for (const [index, sticker] of draft.stickers.entries()) {
    if (index !== 4 && sticker.source === 'manual' && sticker.symbol !== undefined) {
      overrides[index] = sticker.symbol
    }
  }

  if (draft.centerOverrideConfirmed === true && draft.stickers[4]?.symbol !== undefined) {
    overrides[4] = draft.stickers[4].symbol
  }

  return overrides
}

function safeTimestamp(timestamp: string): string {
  return timestamp.replace(/[^0-9A-Za-z]+/g, '-').replace(/^-|-$/g, '')
}
