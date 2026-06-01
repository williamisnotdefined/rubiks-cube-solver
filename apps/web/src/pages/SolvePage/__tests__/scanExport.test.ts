import { describe, expect, it } from 'vitest'
import type { AnalyzeScanFaceResponse } from '@api/scan'
import {
  buildScanSessionExport,
  hasExportableScanSession,
  scanSessionExportSchemaVersion,
} from '../scanExport'
import {
  createInitialScanFaceDrafts,
  replaceScanFaceDraftSticker,
  type ScanFaceDrafts,
} from '../scanState'

describe('scan export helpers', () => {
  it('builds a local scan session export from drafts', () => {
    const drafts = withCapturedFace(replaceScanFaceDraftSticker(createInitialScanFaceDrafts(), 'F', 0, 'R'))

    const exportData = buildScanSessionExport({
      drafts,
      now: new Date('2026-01-02T03:04:05.000Z'),
      sessionResult: {
        inference: {
          manualTargets: [{ face: 'F', stickers: [0] }],
          rescanFaces: [],
          stateConfidence: 0.7,
          status: 'needs_manual_confirmation',
        },
        manualTargets: [{ face: 'F', stickers: [0] }],
        ok: false,
        rescanFaces: [],
        status: 'needs_manual_confirmation',
      },
    })

    expect(exportData).toMatchObject({
      complete: false,
      createdAt: '2026-01-02T03:04:05.000Z',
      schemaVersion: scanSessionExportSchemaVersion,
      source: 'web-scan-modal',
    })
    expect(exportData.faces).toHaveLength(6)
    expect(exportData.faces.find((face) => face.symbol === 'F')).toMatchObject({
      confirmed: true,
      expectedTop: 'U',
      manualOverrides: { 0: 'R' },
      photoDataUrl: 'data:image/jpeg;base64,scan',
      stickers: expect.arrayContaining([
        expect.objectContaining({ index: 0, source: 'manual', symbol: 'R' }),
      ]),
    })
    expect(exportData.sessionResult?.status).toBe('needs_manual_confirmation')
  })

  it('exports explicit center override evidence', () => {
    const drafts = withCapturedFace(createInitialScanFaceDrafts(), true)

    const exportData = buildScanSessionExport({
      drafts,
      now: new Date('2026-01-02T03:04:05.000Z'),
    })

    expect(exportData.faces.find((face) => face.symbol === 'F')).toMatchObject({
      centerOverrideConfirmed: true,
      manualOverrides: { 4: 'F' },
    })
  })

  it('requires at least one captured photo before export', () => {
    const drafts = createInitialScanFaceDrafts()

    expect(hasExportableScanSession(drafts)).toBe(false)
    expect(hasExportableScanSession(withCapturedFace(drafts))).toBe(true)
    expect(hasExportableScanSession(withRejectedCapture(drafts))).toBe(true)
  })

  it('includes rejected capture evidence for local diagnostics', () => {
    const drafts = withRejectedCapture(createInitialScanFaceDrafts())

    const exportData = buildScanSessionExport({
      drafts,
      now: new Date('2026-01-02T03:04:05.000Z'),
    })

    expect(exportData.complete).toBe(false)
    expect(exportData.faces.find((face) => face.symbol === 'F')).toMatchObject({
      confirmed: false,
      lastRejectedCapture: {
        capture: {
          capturedAt: 456,
          height: 720,
          source: 'canvas',
          width: 720,
        },
        photoDataUrl: 'data:image/jpeg;base64,rejected',
        reason: 'guide_fallback',
      },
      photoDataUrl: undefined,
    })
  })
})

function withCapturedFace(drafts: ScanFaceDrafts, centerOverrideConfirmed = false): ScanFaceDrafts {
  return {
    ...drafts,
    F: {
      ...drafts.F,
      centerOverrideConfirmed,
      capture: {
        capturedAt: 123,
        height: 1280,
        source: 'canvas',
        width: 1280,
      },
      confirmed: true,
      photoDataUrl: 'data:image/jpeg;base64,scan',
    },
  }
}

function withRejectedCapture(drafts: ScanFaceDrafts): ScanFaceDrafts {
  return {
    ...drafts,
    F: {
      ...drafts.F,
      analysis: scanAnalysisResponse(),
      lastRejectedCapture: {
        analysis: scanAnalysisResponse(),
        capture: {
          capturedAt: 456,
          height: 720,
          source: 'canvas',
          width: 720,
        },
        photoDataUrl: 'data:image/jpeg;base64,rejected',
        reason: 'guide_fallback',
      },
    },
  }
}

function scanAnalysisResponse(): AnalyzeScanFaceResponse {
  return {
    centerMismatch: false,
    confidence: 0.2,
    detectedCenterConfidence: 0,
    detectionMode: 'guide_fallback',
    expectedCenter: 'F' as const,
    faceConfidence: 0.2,
    faceQuad: [],
    imageSize: { width: 720, height: 720 },
    ok: false,
    qualityWarnings: [],
    status: 'detected',
    stickers: [],
    warnings: ['using_center_guide_fallback'],
  }
}
