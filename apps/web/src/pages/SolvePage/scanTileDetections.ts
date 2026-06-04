import type { ScanDetectionBox, ScanTileDetection } from '@api/scan'
import type { ScanFaceSymbol } from '@api/solver/types'

export type IndexedScanTileDetection = {
  bbox: ScanDetectionBox
  column: number
  confidence: number
  index: number
  row: number
  symbol: ScanFaceSymbol
}

type AssignTileDetectionsOptions = {
  maxCandidates?: number
  minConfidence?: number
}

const scanSymbols = ['U', 'R', 'F', 'D', 'L', 'B'] as const satisfies readonly ScanFaceSymbol[]
const defaultMinConfidence = 0.5
const defaultMaxCandidates = 13

export function validStickerTileDetections(
  tileDetections: readonly ScanTileDetection[] | undefined,
  minConfidence = defaultMinConfidence,
): ScanTileDetection[] {
  return (tileDetections ?? []).filter(
    (detection) =>
      detection.symbol !== 'face' &&
      scanSymbols.includes(detection.symbol) &&
      detection.confidence >= minConfidence &&
      detection.bbox.width > 0 &&
      detection.bbox.height > 0,
  )
}

export function assignTileDetectionsToReviewGrid(
  tileDetections: readonly ScanTileDetection[] | undefined,
  options: AssignTileDetectionsOptions = {},
): IndexedScanTileDetection[] | undefined {
  const minConfidence = options.minConfidence ?? defaultMinConfidence
  const maxCandidates = options.maxCandidates ?? defaultMaxCandidates
  const candidates = validStickerTileDetections(tileDetections, minConfidence)
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, maxCandidates)

  if (candidates.length < 9) {
    return undefined
  }

  let bestAssignment: IndexedScanTileDetection[] | undefined
  let bestScore = Number.NEGATIVE_INFINITY

  for (const combination of combinationsOfNine(candidates)) {
    const assignment = assignCombinationByPosition(combination)
    const score = tileAssignmentScore(assignment)

    if (score > bestScore) {
      bestAssignment = assignment
      bestScore = score
    }
  }

  return bestAssignment
}

export function assignedTileDetectionsReady(
  tileDetections: readonly ScanTileDetection[] | undefined,
  expectedCenter: ScanFaceSymbol,
): boolean {
  const assignedTiles = assignTileDetectionsToReviewGrid(tileDetections)
  return assignedTiles !== undefined && assignedTiles[4]?.symbol === expectedCenter
}

function assignCombinationByPosition(
  detections: readonly ScanTileDetection[],
): IndexedScanTileDetection[] {
  const rows = detections
    .slice()
    .sort((left, right) => left.bbox.y - right.bbox.y)
    .reduce<ScanTileDetection[][]>((groups, detection, index) => {
      const row = Math.floor(index / 3)
      groups[row] ??= []
      groups[row].push(detection)
      return groups
    }, [])

  return rows.flatMap((rowDetections, row) =>
    rowDetections
      .slice()
      .sort((left, right) => left.bbox.x - right.bbox.x)
      .map((detection, column) => ({
        bbox: detection.bbox,
        column,
        confidence: detection.confidence,
        index: row * 3 + column,
        row,
        symbol: detection.symbol as ScanFaceSymbol,
      })),
  )
}

function tileAssignmentScore(assignment: readonly IndexedScanTileDetection[]): number {
  const averageConfidence = average(assignment.map((tile) => tile.confidence))
  const rowSpread = average([0, 1, 2].map((row) => spread(assignment.filter((tile) => tile.row === row).map((tile) => tile.bbox.y))))
  const columnSpread = average([0, 1, 2].map((column) => spread(assignment.filter((tile) => tile.column === column).map((tile) => tile.bbox.x))))
  const rowSpacing = spacingScore(rowCenters(assignment))
  const columnSpacing = spacingScore(columnCenters(assignment))

  return averageConfidence + rowSpacing * 0.14 + columnSpacing * 0.14 - rowSpread * 0.65 - columnSpread * 0.65
}

function* combinationsOfNine<T>(items: readonly T[]): Generator<T[]> {
  const selected: T[] = []

  function* visit(start: number): Generator<T[]> {
    if (selected.length === 9) {
      yield selected.slice()
      return
    }

    const remainingSlots = 9 - selected.length
    for (let index = start; index <= items.length - remainingSlots; index += 1) {
      selected.push(items[index])
      yield* visit(index + 1)
      selected.pop()
    }
  }

  yield* visit(0)
}

function rowCenters(assignment: readonly IndexedScanTileDetection[]): number[] {
  return [0, 1, 2].map((row) => average(assignment.filter((tile) => tile.row === row).map((tile) => tile.bbox.y)))
}

function columnCenters(assignment: readonly IndexedScanTileDetection[]): number[] {
  return [0, 1, 2].map((column) => average(assignment.filter((tile) => tile.column === column).map((tile) => tile.bbox.x)))
}

function spacingScore(values: readonly number[]): number {
  const firstGap = values[1] - values[0]
  const secondGap = values[2] - values[1]
  const minGap = Math.min(firstGap, secondGap)
  const gapBalance = 1 - Math.min(1, Math.abs(firstGap - secondGap) / Math.max(firstGap, secondGap, 0.01))

  return minGap > 0.05 ? gapBalance : 0
}

function spread(values: readonly number[]): number {
  const center = average(values)
  return average(values.map((value) => Math.abs(value - center)))
}

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}
