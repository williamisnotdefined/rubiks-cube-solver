import type { ScanFaceSymbol } from '@api/solver/types'
import {
  createEmptyScanStickers,
  scanSymbols,
  type RgbColor,
  type ScanSticker,
} from './scanState'

export type ScanColorReferences = Partial<Record<ScanFaceSymbol, RgbColor>>

export type ScanColorMatch = {
  symbol: ScanFaceSymbol
  confidence: number
}

export type ScanCenterAnalysis = {
  confidence: number
  detectedSymbol: ScanFaceSymbol
  expectedSymbol: ScanFaceSymbol
  mismatched: boolean
}

export type CapturedScanFrame = {
  stickers: ScanSticker[]
  photoDataUrl: string
  centerRgb: RgbColor
  centerAnalysis: ScanCenterAnalysis
}

type HsvColor = {
  h: number
  s: number
  v: number
}

type PixelSample = RgbColor & {
  luminance: number
}

const defaultColorReferences: Record<ScanFaceSymbol, RgbColor> = {
  U: { r: 248, g: 250, b: 252 },
  R: { r: 239, g: 68, b: 68 },
  F: { r: 34, g: 197, b: 94 },
  D: { r: 250, g: 204, b: 21 },
  L: { r: 249, g: 115, b: 22 },
  B: { r: 37, g: 99, b: 235 },
}

const centerMismatchConfidence = 0.22
const maxCaptureFrameSize = 640
const scanGuideScale = 0.72

export function captureScanFrame(
  video: HTMLVideoElement,
  centerSymbol: ScanFaceSymbol,
  references: ScanColorReferences,
): CapturedScanFrame | undefined {
  const width = video.videoWidth
  const height = video.videoHeight

  if (width === 0 || height === 0) {
    return undefined
  }

  const sourceSize = Math.min(width, height)
  const frameSize = Math.min(maxCaptureFrameSize, sourceSize)
  const sourceX = Math.floor((width - sourceSize) / 2)
  const sourceY = Math.floor((height - sourceSize) / 2)
  const canvas = document.createElement('canvas')
  canvas.width = frameSize
  canvas.height = frameSize
  const context = canvas.getContext('2d', { willReadFrequently: true })

  if (context === null) {
    return undefined
  }

  context.drawImage(video, sourceX, sourceY, sourceSize, sourceSize, 0, 0, frameSize, frameSize)

  const squareSize = Math.floor(frameSize * scanGuideScale)
  const startX = Math.floor((frameSize - squareSize) / 2)
  const startY = Math.floor((frameSize - squareSize) / 2)
  const cellSize = squareSize / 3
  const centerRgb = sampleStickerColor(context, startX, startY, cellSize, 1, 1)
  const centerDetection = classifyScanColor(centerRgb, references)
  const centerAnalysis: ScanCenterAnalysis = {
    confidence: centerDetection.confidence,
    detectedSymbol: centerDetection.symbol,
    expectedSymbol: centerSymbol,
    mismatched: isMismatchedScanCenter(centerSymbol, centerDetection),
  }
  const nextReferences = centerAnalysis.mismatched
    ? references
    : { ...references, [centerSymbol]: centerRgb }
  const stickers = createEmptyScanStickers(centerSymbol)

  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      const index = row * 3 + column
      const rgb = sampleStickerColor(context, startX, startY, cellSize, column, row)
      const detected = classifyScanColor(rgb, nextReferences)

      stickers[index] = {
        rgb,
        symbol: index === 4 ? centerSymbol : detected.symbol,
        confidence: index === 4 ? 1 : detected.confidence,
        source: index === 4 ? 'center' : 'detected',
      }
    }
  }

  return {
    stickers,
    photoDataUrl: canvas.toDataURL('image/jpeg', 0.76),
    centerRgb,
    centerAnalysis,
  }
}

export function classifyScanColor(
  rgb: RgbColor,
  references: ScanColorReferences = {},
): ScanColorMatch {
  const hsv = rgbToHsv(rgb)
  const distances = scanSymbols
    .map((symbol) => ({
      symbol,
      distance: colorDistance(hsv, rgbToHsv(referenceForSymbol(symbol, references)), symbol),
    }))
    .sort((a, b) => a.distance - b.distance)
  const best = distances[0]
  const second = distances[1]
  const confidence = second.distance === 0 ? 1 : (second.distance - best.distance) / second.distance

  return {
    symbol: best.symbol,
    confidence: Math.min(1, Math.max(0, confidence)),
  }
}

export function isMismatchedScanCenter(
  expectedSymbol: ScanFaceSymbol,
  detected: ScanColorMatch,
): boolean {
  return detected.symbol !== expectedSymbol && detected.confidence >= centerMismatchConfidence
}

function sampleStickerColor(
  context: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  cellSize: number,
  column: number,
  row: number,
): RgbColor {
  const sampleSize = Math.max(8, Math.floor(cellSize * 0.38))
  const x = Math.floor(startX + column * cellSize + (cellSize - sampleSize) / 2)
  const y = Math.floor(startY + row * cellSize + (cellSize - sampleSize) / 2)
  const imageData = context.getImageData(x, y, sampleSize, sampleSize)
  const samples: PixelSample[] = []

  for (let index = 0; index < imageData.data.length; index += 4) {
    const r = imageData.data[index]
    const g = imageData.data[index + 1]
    const b = imageData.data[index + 2]
    samples.push({ r, g, b, luminance: 0.2126 * r + 0.7152 * g + 0.0722 * b })
  }

  samples.sort((left, right) => left.luminance - right.luminance)

  const firstSample = Math.floor(samples.length * 0.14)
  const lastSample = Math.max(firstSample + 1, Math.ceil(samples.length * 0.86))
  let r = 0
  let g = 0
  let b = 0

  for (let index = firstSample; index < lastSample; index += 1) {
    r += samples[index].r
    g += samples[index].g
    b += samples[index].b
  }

  const pixels = lastSample - firstSample

  return {
    r: Math.round(r / pixels),
    g: Math.round(g / pixels),
    b: Math.round(b / pixels),
  }
}

function colorDistance(left: HsvColor, right: HsvColor, symbol: ScanFaceSymbol): number {
  const hue = hueDistance(left.h, right.h)
  const saturation = Math.abs(left.s - right.s)
  const value = Math.abs(left.v - right.v)

  if (symbol === 'U' || right.s < 0.22) {
    const hueScore = left.s < 0.16 || right.s < 0.16 ? 0 : hue * 0.25
    return saturation * 2.8 + value * 0.8 + hueScore
  }

  const lowSaturationPenalty = left.s < 0.35 ? (0.35 - left.s) * 2.5 : 0

  return hue * 3 + saturation * 0.45 + value * 0.25 + lowSaturationPenalty
}

function referenceForSymbol(
  symbol: ScanFaceSymbol,
  references: ScanColorReferences,
): RgbColor {
  const reference = references[symbol]

  if (reference === undefined) {
    return defaultColorReferences[symbol]
  }

  const hsv = rgbToHsv(reference)

  if (symbol === 'U' && hsv.s > 0.35) {
    return defaultColorReferences[symbol]
  }

  if (symbol !== 'U' && hsv.s < 0.18) {
    return defaultColorReferences[symbol]
  }

  return reference
}

function rgbToHsv({ r, g, b }: RgbColor): HsvColor {
  const red = r / 255
  const green = g / 255
  const blue = b / 255
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const delta = max - min
  let h = 0

  if (delta !== 0) {
    if (max === red) {
      h = 60 * (((green - blue) / delta) % 6)
    } else if (max === green) {
      h = 60 * ((blue - red) / delta + 2)
    } else {
      h = 60 * ((red - green) / delta + 4)
    }
  }

  return {
    h: h < 0 ? h + 360 : h,
    s: max === 0 ? 0 : delta / max,
    v: max,
  }
}

function hueDistance(left: number, right: number): number {
  const distance = Math.abs(left - right)

  return Math.min(distance, 360 - distance) / 180
}
