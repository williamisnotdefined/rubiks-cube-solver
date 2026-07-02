import { describe, expect, it } from 'vitest'
import type { AnalyzeScanFaceResponse } from '@api/scan'
import type { ScanFaceSymbol } from '@api/solver/types'
import {
  addTemporalScanFrame,
  buildTemporalFaceConsensus,
  defaultTemporalConsensusOptions,
  isTemporalConsensusReady,
  type TemporalScanFrame,
} from '../scanTemporalConsensus'

describe('scanTemporalConsensus', () => {
  it('returns an empty consensus before any frames are available', () => {
    const consensus = buildTemporalFaceConsensus([])

    expect(consensus.status).toBe('empty')
    expect(consensus.framesSeen).toBe(0)
    expect(isTemporalConsensusReady(consensus)).toBe(false)
  })

  it('returns ready consensus for stable repeated sticker frames', () => {
    const frames = temporalFrames(6)

    const consensus = buildTemporalFaceConsensus(frames)

    expect(consensus.status).toBe('ready')
    expect(isTemporalConsensusReady(consensus)).toBe(true)
    expect(consensus.framesSeen).toBe(6)
    expect(consensus.framesUsed).toBe(6)
    expect(consensus.temporalAgreement).toBe(1)
    expect(consensus.stickers).toHaveLength(9)
    expect(consensus.stickers[4]).toMatchObject({ symbol: 'U', agreement: 1 })
  })

  it('returns ready consensus for stable repeated 2x2 sticker frames', () => {
    const frames = temporalFrames(6, {
      analysis: { tileDetections: stable2x2TileDetections('F') },
    })

    const consensus = buildTemporalFaceConsensus(frames, {
      ...defaultTemporalConsensusOptions,
      gridSize: 2,
      minTileDetections: 4,
    })

    expect(consensus.status).toBe('ready')
    expect(consensus.stickers).toHaveLength(4)
    expect(consensus.framesUsed).toBe(6)
  })

  it('collects until the minimum frame count is reached', () => {
    const consensus = buildTemporalFaceConsensus(temporalFrames(5))

    expect(consensus.status).toBe('collecting')
    expect(consensus.framesUsed).toBe(5)
  })

  it('rejects center mismatches before consensus can become ready', () => {
    const consensus = buildTemporalFaceConsensus(
      temporalFrames(6, { analysis: { centerMismatch: true, ok: false } }),
    )

    expect(consensus.status).toBe('center_mismatch')
    expect(consensus.framesUsed).toBe(0)
    expect(consensus.rejectReasons).toContain('center_mismatch')
  })

  it('rejects unsupported non-tile modes', () => {
    const consensus = buildTemporalFaceConsensus(
      temporalFrames(6, { analysis: { detectionMode: 'legacy_geometry' } }),
    )

    expect(consensus.status).toBe('collecting')
    expect(consensus.framesUsed).toBe(0)
    expect(consensus.rejectReasons).toContain('unsupported_detection_mode')

    const legacyConsensus = buildTemporalFaceConsensus(
      temporalFrames(6, { analysis: { detectionMode: 'legacy_mode' } }),
    )

    expect(legacyConsensus.framesUsed).toBe(0)
    expect(legacyConsensus.rejectReasons).toContain('unsupported_detection_mode')

    const missingModeConsensus = buildTemporalFaceConsensus(
      temporalFrames(6, { analysis: { detectionMode: undefined } }),
    )

    expect(missingModeConsensus.rejectReasons).toContain('unsupported_detection_mode')
  })

  it('rejects frames with weak confidence or critical quality warnings', () => {
    const consensus = buildTemporalFaceConsensus(
      temporalFrames(6, {
        analysis: {
          faceConfidence: 0.2,
          qualityWarnings: ['image_blurry'],
          tileDetections: stableTileDetections(0, 'F').map((detection) => ({
            ...detection,
            confidence: 0.55,
          })),
          warnings: ['image_too_dark'],
        },
      }),
    )

    expect(consensus.status).toBe('collecting')
    expect(consensus.framesRejected).toBe(6)
    expect(consensus.rejectReasons).toEqual(
      expect.arrayContaining(['critical_quality_warning', 'low_face_confidence', 'low_tile_confidence']),
    )
  })

  it('reports partial tiles when 9 YOLO stickers are missing', () => {
    const consensus = buildTemporalFaceConsensus(
      temporalFrames(6, { analysis: { tileDetections: [] } }),
    )

    expect(consensus.status).toBe('partial_tiles')
    expect(consensus.rejectReasons).toContain('insufficient_tile_detections')
  })

  it('reports color disagreement when stickers flicker across frames', () => {
    const frames = temporalFrames(6).map((frame, index) =>
      index % 2 === 0
        ? frame
        : {
            ...frame,
            analysis: scanAnalysis({ nonCenterSymbol: 'R' }),
          },
    )

    const consensus = buildTemporalFaceConsensus(frames)

    expect(consensus.status).toBe('color_disagreement')
    expect(consensus.stickers[0].agreement).toBeCloseTo(0.5)
    expect(consensus.stickers[0].alternatives).toEqual(
      expect.arrayContaining([expect.objectContaining({ symbol: 'R' })]),
    )
  })

  it('reports unstable when sticker boxes move too much', () => {
    const frames = temporalFrames(6, { boxShiftPerFrame: 0.05 })

    const consensus = buildTemporalFaceConsensus(frames)

    expect(consensus.status).toBe('unstable')
    expect(consensus.rejectReasons).toContain('bbox_unstable')
  })

  it('uses tile detector symbols and ignores analysis sticker probabilities', () => {
    const frames = temporalFrames(6, {
      analysis: {
        stickers: scanAnalysis().stickers.map((sticker) =>
          sticker.index === 0
            ? {
                ...sticker,
                probabilities: { B: 0.01, D: 0.01, F: 0.1, L: 0.01, R: 0.85, U: 0.02 },
                symbol: 'F',
              }
            : sticker,
        ),
      },
    })

    const consensus = buildTemporalFaceConsensus(frames)

    expect(consensus.stickers[0].symbol).toBe('F')
    expect(consensus.stickers[0].confidence).toBeGreaterThan(0.5)
  })

  it('drops old frames and caps the buffer size', () => {
    let buffer: TemporalScanFrame[] = []
    for (let index = 0; index < 16; index += 1) {
      buffer = addTemporalScanFrame(buffer, temporalFrame(index * 320))
    }

    expect(buffer.length).toBeLessThanOrEqual(defaultTemporalConsensusOptions.maxFrames)
    expect(buffer[0].capturedAt).toBeGreaterThanOrEqual(15 * 320 - defaultTemporalConsensusOptions.maxFrameAgeMs)
  })
})

function temporalFrames(
  count: number,
  options: {
    analysis?: Partial<AnalyzeScanFaceResponse>
    boxShiftPerFrame?: number
  } = {},
): TemporalScanFrame[] {
  return Array.from({ length: count }, (_, index) =>
    temporalFrame(index * 320, {
      analysis: options.analysis,
      boxShift: (options.boxShiftPerFrame ?? 0) * index,
    }),
  )
}

function temporalFrame(
  capturedAt: number,
  options: { analysis?: Partial<AnalyzeScanFaceResponse>; boxShift?: number } = {},
): TemporalScanFrame {
  return {
    analysis: scanAnalysis({ ...options.analysis, boxShift: options.boxShift }),
    capturedAt,
    expectedCenter: 'U',
  }
}

function scanAnalysis(
  options: Partial<AnalyzeScanFaceResponse> & {
    boxShift?: number
    nonCenterSymbol?: ScanFaceSymbol
  } = {},
): AnalyzeScanFaceResponse {
  const boxShift = options.boxShift ?? 0
  const nonCenterSymbol = options.nonCenterSymbol ?? 'F'
  const tileDetections = options.tileDetections ?? stableTileDetections(boxShift, nonCenterSymbol)
  const stickers =
    options.stickers ??
    Array.from({ length: 9 }, (_, index) => ({
      alternatives: [],
      confidence: 0.92,
      index,
      polygon: [],
      rgb: { b: 40, g: 160, r: 40 },
      symbol: index === 4 ? 'U' : nonCenterSymbol,
    }))

  return {
    centerMismatch: false,
    confidence: 0.9,
    detectedCenter: 'U',
    detectedCenterConfidence: 0.9,
    detectionMode: 'tile_detector',
    expectedCenter: 'U',
    faceConfidence: 0.88,
    imageSize: { height: 480, width: 480 },
    ok: true,
    qualityWarnings: [],
    status: 'detected',
    stickers,
    tileDetections,
    warnings: [],
    ...options,
  }
}

function stableTileDetections(
  boxShift: number,
  nonCenterSymbol: ScanFaceSymbol,
): NonNullable<AnalyzeScanFaceResponse['tileDetections']> {
  return Array.from({ length: 9 }, (_, index) => {
    const row = Math.floor(index / 3)
    const column = index % 3

    return {
      bbox: {
        height: 0.18,
        width: 0.18,
        x: 0.25 + column * 0.25 + boxShift,
        y: 0.25 + row * 0.25,
      },
      confidence: 0.9,
      symbol: index === 4 ? 'U' : nonCenterSymbol,
    }
  })
}

function stable2x2TileDetections(symbol: ScanFaceSymbol): NonNullable<AnalyzeScanFaceResponse['tileDetections']> {
  return Array.from({ length: 4 }, (_, index) => {
    const row = Math.floor(index / 2)
    const column = index % 2

    return {
      bbox: {
        height: 0.24,
        width: 0.24,
        x: 0.32 + column * 0.3,
        y: 0.32 + row * 0.3,
      },
      confidence: 0.9,
      symbol,
    }
  })
}
