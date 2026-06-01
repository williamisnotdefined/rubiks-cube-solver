import { describe, expect, it } from 'vitest'
import type { ScanDatasetSession } from '../scanDatasetExport'
import {
  buildScanDatasetExport,
  manualCorrectionsFromStickers,
  scanDatasetExportSchemaVersion,
} from '../scanDatasetExport'

describe('scan dataset export helpers', () => {
  it('builds a dataset export with non-empty sessions only', () => {
    const exportData = buildScanDatasetExport({
      now: new Date('2026-01-02T03:04:05.000Z'),
      sessions: [sessionFixture('empty', []), sessionFixture('one-face', ['F'])],
    })

    expect(exportData).toMatchObject({
      createdAt: '2026-01-02T03:04:05.000Z',
      schemaVersion: scanDatasetExportSchemaVersion,
      source: 'web-scan-dataset-page',
    })
    expect(exportData.sessions).toHaveLength(1)
    expect(exportData.sessions[0].sessionId).toBe('one-face')
  })

  it('extracts manual corrections from sticker labels', () => {
    expect(
      manualCorrectionsFromStickers([
        { confidence: 1, source: 'center', symbol: 'F' },
        { confidence: 1, source: 'manual', symbol: 'R' },
        { confidence: 0.7, source: 'detected', symbol: 'U' },
      ]),
    ).toEqual({ 1: 'R' })
  })
})

function sessionFixture(sessionId: string, faces: string[]): ScanDatasetSession {
  return {
    captureCondition: { background: 'dark', lighting: 'good', notes: '' },
    cubeId: 'cube_a',
    faces: faces.map((face) => ({
      acceptedAt: '2026-01-02T03:04:05.000Z',
      capture: { capturedAt: 123, height: 1280, source: 'canvas', width: 1280 },
      expectedTop: 'U',
      face: face as 'F',
      label: face.repeat(9),
      manualCorrections: {},
      photoDataUrl: 'data:image/jpeg;base64,scan',
      stickers: [],
    })),
    mode: 'manual_label',
    sessionId,
    startedAt: '2026-01-02T03:04:05.000Z',
  }
}
