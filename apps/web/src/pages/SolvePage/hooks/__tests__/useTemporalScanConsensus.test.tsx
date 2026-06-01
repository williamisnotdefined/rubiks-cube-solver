import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { AnalyzeScanFaceResponse } from '@api/scan'
import type { ScanFaceSymbol } from '@api/solver/types'
import { useTemporalScanConsensus } from '../useTemporalScanConsensus'

describe('useTemporalScanConsensus', () => {
  it('records frames and exposes ready consensus after enough stable analyses', () => {
    const { result } = renderHook(() =>
      useTemporalScanConsensus({
        enabled: true,
        expectedCenter: 'U',
      }),
    )

    act(() => {
      for (let frame = 0; frame < 6; frame += 1) {
        result.current.recordAnalysis(scanAnalysis(), frame * 320)
      }
    })

    expect(result.current.temporalConsensus.status).toBe('ready')
    expect(result.current.temporalConsensus.framesUsed).toBe(6)
  })

  it('resets when the expected center changes', () => {
    const { rerender, result } = renderHook(
      ({ expectedCenter }) =>
      useTemporalScanConsensus({
        enabled: true,
        expectedCenter,
      }),
      { initialProps: { expectedCenter: 'U' as ScanFaceSymbol } },
    )

    act(() => {
      result.current.recordAnalysis(scanAnalysis(), 0)
    })
    expect(result.current.temporalConsensus.framesSeen).toBe(1)

    rerender({ expectedCenter: 'F' })

    expect(result.current.temporalConsensus.status).toBe('empty')
    expect(result.current.temporalConsensus.framesSeen).toBe(0)
  })

  it('does not record frames while disabled', () => {
    const { result } = renderHook(() =>
      useTemporalScanConsensus({
        enabled: false,
        expectedCenter: 'U',
      }),
    )

    act(() => {
      result.current.recordAnalysis(scanAnalysis(), 0)
    })

    expect(result.current.temporalConsensus.status).toBe('empty')
  })
})

function scanAnalysis(): AnalyzeScanFaceResponse {
  const gridDetections = Array.from({ length: 9 }, (_, index) => {
    const row = Math.floor(index / 3)
    const column = index % 3

    return {
      bbox: {
        height: 0.18,
        width: 0.18,
        x: 0.25 + column * 0.25,
        y: 0.25 + row * 0.25,
      },
      column,
      confidence: 0.9,
      index,
      row,
      symbol: (index === 4 ? 'U' : 'F') as ScanFaceSymbol,
    }
  })

  return {
    centerMismatch: false,
    confidence: 0.9,
    detectedCenter: 'U',
    detectedCenterConfidence: 0.9,
    detectionMode: 'tile_detector',
    expectedCenter: 'U',
    faceConfidence: 0.88,
    faceQuad: [],
    gridConfidence: 0.8,
    gridDetections,
    gridStatus: 'ready',
    imageSize: { height: 480, width: 480 },
    ok: true,
    qualityWarnings: [],
    status: 'detected',
    stickers: Array.from({ length: 9 }, (_, index) => ({
      alternatives: [],
      confidence: 0.92,
      index,
      polygon: [],
      rgb: { b: 40, g: 160, r: 40 },
      symbol: index === 4 ? 'U' : 'F',
    })),
    tileDetections: [],
    warnings: [],
  }
}
