import type { AnalyzeScanFaceResponse } from '@api/scan'
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import i18n from '@src/i18n/i18n'
import { createInitialScanFaceDrafts, type ScanFaceDrafts } from '../../../../scanState'
import type { TemporalFaceConsensus } from '../../../../scanTemporalConsensus'
import { useScanLiveAutofill } from '../useScanLiveAutofill'

describe('useScanLiveAutofill', () => {
  it('preserves a draft that was confirmed before the queued autofill update runs', () => {
    const drafts = createInitialScanFaceDrafts(9)
    const setDrafts = vi.fn()
    const acknowledgeAutoFill = vi.fn()
    const onFaceCleared = vi.fn()
    const setMessage = vi.fn()

    renderHook(() =>
      useScanLiveAutofill({
        acknowledgeAutoFill,
        capturing: false,
        currentDraft: drafts.F,
        currentFaceSymbol: 'F',
        liveAnalysis: liveAnalysis,
        liveCapture: {
          capturedAt: 123,
          height: 480,
          photoDataUrl: 'data:image/jpeg;base64,autofill',
          source: 'canvas',
          width: 480,
        },
        liveTemporalConsensus: readyConsensus,
        onFaceCleared,
        photoDataUrl: undefined,
        setDrafts,
        setMessage,
        shouldAutoFill: true,
        stickersPerFace: 9,
        t: i18n.t,
      }),
    )

    const queuedUpdate = setDrafts.mock.calls[0]?.[0] as
      | ((currentDrafts: ScanFaceDrafts) => ScanFaceDrafts)
      | undefined
    const confirmedDrafts: ScanFaceDrafts = {
      ...drafts,
      F: {
        ...drafts.F,
        confirmed: true,
        photoDataUrl: 'data:image/jpeg;base64,confirmed',
      },
    }

    expect(queuedUpdate).toBeTypeOf('function')
    expect(queuedUpdate?.(confirmedDrafts)).toBe(confirmedDrafts)
    expect(confirmedDrafts.F.photoDataUrl).toBe('data:image/jpeg;base64,confirmed')
    expect(acknowledgeAutoFill).not.toHaveBeenCalled()
    expect(onFaceCleared).not.toHaveBeenCalled()
    expect(setMessage).not.toHaveBeenCalled()
  })
})

const liveAnalysis: AnalyzeScanFaceResponse = {
  centerMismatch: false,
  confidence: 1,
  detectedCenter: 'F',
  detectedCenterConfidence: 1,
  detectionMode: 'tile_detector',
  expectedCenter: 'F',
  faceConfidence: 0.9,
  imageSize: { height: 480, width: 480 },
  ok: true,
  qualityWarnings: [],
  status: 'detected',
  stickers: Array.from({ length: 9 }, (_, index) => ({
    alternatives: [],
    confidence: 0.9,
    index,
    polygon: [],
    rgb: { b: 40, g: 160, r: 40 },
    symbol: 'F' as const,
  })),
  tileDetections: Array.from({ length: 9 }, (_, index) => ({
    bbox: {
      height: 0.18,
      width: 0.18,
      x: 0.25 + (index % 3) * 0.25,
      y: 0.25 + Math.floor(index / 3) * 0.25,
    },
    confidence: 0.9,
    symbol: 'F' as const,
  })),
  warnings: [],
}

const readyConsensus: TemporalFaceConsensus = {
  bboxStability: 0.95,
  faceConfidence: 0.9,
  framesRejected: 0,
  framesSeen: 6,
  framesUsed: 6,
  rejectReasons: [],
  status: 'ready',
  stickers: Array.from({ length: 9 }, (_, index) => ({
    agreement: 1,
    alternatives: [],
    confidence: 0.9,
    framesUsed: 6,
    index,
    margin: 1,
    symbol: 'F' as const,
  })),
  temporalAgreement: 1,
  tileConfidence: 0.9,
}
