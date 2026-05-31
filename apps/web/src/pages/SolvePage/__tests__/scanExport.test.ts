import { describe, expect, it } from 'vitest'
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

  it('requires at least one captured photo before export', () => {
    const drafts = createInitialScanFaceDrafts()

    expect(hasExportableScanSession(drafts)).toBe(false)
    expect(hasExportableScanSession(withCapturedFace(drafts))).toBe(true)
  })
})

function withCapturedFace(drafts: ScanFaceDrafts): ScanFaceDrafts {
  return {
    ...drafts,
    F: {
      ...drafts.F,
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
