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
  gridSize?: number
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
  const gridSize = options.gridSize ?? 3
  const targetTileCount = gridSize * gridSize
  const maxCandidates = options.maxCandidates ?? (gridSize === 2 ? 8 : defaultMaxCandidates)
  const candidates = validStickerTileDetections(tileDetections, minConfidence)
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, maxCandidates)

  if (candidates.length < targetTileCount) {
    return undefined
  }

  let bestAssignment: IndexedScanTileDetection[] | undefined
  let bestScore = Number.NEGATIVE_INFINITY

  for (const combination of combinations(candidates, targetTileCount)) {
    const assignment = assignCombinationByPosition(combination, gridSize)
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
  gridSize = 3,
): boolean {
  const assignedTiles = assignTileDetectionsToReviewGrid(tileDetections, { gridSize })
  return assignedTiles !== undefined && (gridSize === 2 || assignedTiles[4]?.symbol === expectedCenter)
}

function assignCombinationByPosition(
  detections: readonly ScanTileDetection[],
  gridSize: number,
): IndexedScanTileDetection[] {
  const rows = detections
    .slice()
    .sort((left, right) => left.bbox.y - right.bbox.y)
    .reduce<ScanTileDetection[][]>((groups, detection, index) => {
      const row = Math.floor(index / gridSize)
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
        index: row * gridSize + column,
        row,
        symbol: detection.symbol as ScanFaceSymbol,
      })),
  )
}

function tileAssignmentScore(assignment: readonly IndexedScanTileDetection[]): number {
  const gridSize = Math.sqrt(assignment.length)
  const averageConfidence = average(assignment.map((tile) => tile.confidence))
  const indexes = Array.from({ length: gridSize }, (_, index) => index)
  const rowSpread = average(indexes.map((row) => spread(assignment.filter((tile) => tile.row === row).map((tile) => tile.bbox.y))))
  const columnSpread = average(indexes.map((column) => spread(assignment.filter((tile) => tile.column === column).map((tile) => tile.bbox.x))))
  const rowSpacing = spacingScore(rowCenters(assignment, gridSize))
  const columnSpacing = spacingScore(columnCenters(assignment, gridSize))

  return averageConfidence + rowSpacing * 0.14 + columnSpacing * 0.14 - rowSpread * 0.65 - columnSpread * 0.65
}

function* combinations<T>(items: readonly T[], targetCount: number): Generator<T[]> {
  const selected: T[] = []

  function* visit(start: number): Generator<T[]> {
    if (selected.length === targetCount) {
      yield selected.slice()
      return
    }

    const remainingSlots = targetCount - selected.length
    for (let index = start; index <= items.length - remainingSlots; index += 1) {
      selected.push(items[index])
      yield* visit(index + 1)
      selected.pop()
    }
  }

  yield* visit(0)
}

function rowCenters(assignment: readonly IndexedScanTileDetection[], gridSize: number): number[] {
  return Array.from({ length: gridSize }, (_, row) => average(assignment.filter((tile) => tile.row === row).map((tile) => tile.bbox.y)))
}

function columnCenters(assignment: readonly IndexedScanTileDetection[], gridSize: number): number[] {
  return Array.from({ length: gridSize }, (_, column) => average(assignment.filter((tile) => tile.column === column).map((tile) => tile.bbox.x)))
}

function spacingScore(values: readonly number[]): number {
  if (values.length === 2) {
    return values[1] - values[0] > 0.05 ? 1 : 0
  }

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
