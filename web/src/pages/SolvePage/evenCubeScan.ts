import type { ScanSessionFaceRequest } from '@api/scan'
import type { ScanFaceSymbol } from '@api/solver/types'
import {
  isScanFaceComplete,
  expectedTopForScanFace,
  scan2StickersPerFace,
  scanFaceOrder,
  scanSymbols,
  type ScanFaceDrafts,
  type ScanSticker,
} from './scanState'

export type EvenCubeFaceRotation = 0 | 90 | 180 | 270

export type EvenCubeFaceRotations = Partial<Record<ScanFaceSymbol, EvenCubeFaceRotation>>

export type EvenCubeNetAssignments = Record<ScanFaceSymbol, ScanFaceSymbol>

export type EvenCubeAutoFitResult =
  | { alternatives: number; status: 'ambiguous' }
  | { status: 'none' }
  | { solution: EvenCubeFitSolution; status: 'suggested' }
  | { solution: EvenCubeFitSolution; status: 'unique' }

export type EvenCubeFitSolution = {
  assignments: EvenCubeNetAssignments
  changes: EvenCubeFitChanges
  rotations: EvenCubeFaceRotations
  score: number
}

export type EvenCubeFitChanges = {
  rotatedFaces: number
  rotationQuarterTurns: number
  swappedSlots: number
}

export type EvenCubeCornerStickerTarget = {
  index: number
  slot: ScanFaceSymbol
}

export type EvenCubeInvalidCorner = {
  faces: readonly [ScanFaceSymbol, ScanFaceSymbol, ScanFaceSymbol]
  position: string
  stickers: readonly [ScanFaceSymbol, ScanFaceSymbol, ScanFaceSymbol]
  targets: readonly [EvenCubeCornerStickerTarget, EvenCubeCornerStickerTarget, EvenCubeCornerStickerTarget]
}

export type EvenCubeValidation = {
  invalidCorners: EvenCubeInvalidCorner[]
  ok: boolean
}

type CornerDefinition = {
  faces: readonly [ScanFaceSymbol, ScanFaceSymbol, ScanFaceSymbol]
  position: string
  stickers: readonly [readonly [ScanFaceSymbol, number], readonly [ScanFaceSymbol, number], readonly [ScanFaceSymbol, number]]
}

const validCornerKeys = new Set(['FRU', 'FLU', 'BLU', 'BRU', 'DFR', 'DFL', 'BDL', 'BDR'])
const maxFitSolutions = 20
const suggestionScoreGap = 50
const defaultEvenCubeNetAssignments: EvenCubeNetAssignments = {
  B: 'B',
  D: 'D',
  F: 'F',
  L: 'R',
  R: 'L',
  U: 'U',
}
const defaultEvenCubeFaceRotations: EvenCubeFaceRotations = { D: 180 }

export function evenCubeScanSessionFacesFromDrafts(
  drafts: ScanFaceDrafts,
  rotations: EvenCubeFaceRotations,
  assignments: EvenCubeNetAssignments,
  stickersPerFace = scan2StickersPerFace,
): ScanSessionFaceRequest[] | undefined {
  const netDrafts = evenCubeDraftsFromNet(drafts, rotations, assignments)
  const faces: ScanSessionFaceRequest[] = []

  for (const { symbol } of scanFaceOrder) {
    const draft = netDrafts[symbol]
    if (!draft.confirmed || !isScanFaceComplete(draft.stickers, stickersPerFace)) {
      return undefined
    }

    const manualOverrides: Partial<Record<number, ScanFaceSymbol>> = {}
    const reviewedStickers = draft.stickers.map((sticker, index) => {
      if (sticker.symbol !== undefined && sticker.source === 'manual') {
        manualOverrides[index] = sticker.symbol
      }

      return {
        confidence: sticker.confidence,
        index,
        source: sticker.source,
        symbol: sticker.symbol as ScanFaceSymbol,
      }
    })

    faces.push({
      expectedTop: expectedTopForScanFace(symbol),
      image: draft.photoDataUrl,
      manualOverrides: Object.keys(manualOverrides).length > 0 ? manualOverrides : undefined,
      reviewedStickers,
      symbol,
    })
  }

  return faces
}

export function validateEvenCubeScan(
  drafts: ScanFaceDrafts,
  rotations: EvenCubeFaceRotations,
  assignments: EvenCubeNetAssignments,
  stickersPerFace = scan2StickersPerFace,
): EvenCubeValidation {
  const sessionFaces = evenCubeScanSessionFacesFromDrafts(drafts, rotations, assignments, stickersPerFace)
  if (sessionFaces === undefined) {
    return { invalidCorners: [], ok: false }
  }

  const faces = new Map(
    sessionFaces.map((face) => [
      face.symbol as ScanFaceSymbol,
      (face.reviewedStickers ?? []).map((sticker) => sticker.symbol as ScanFaceSymbol),
    ]),
  )
  const invalidCorners: EvenCubeInvalidCorner[] = []

  for (const corner of evenCubeCornerDefinitions(stickersPerFace)) {
    const stickers = corner.stickers.map(([face, index]) => faces.get(face)?.[index])
    if (stickers.some((sticker) => sticker === undefined)) {
      continue
    }

    const cornerStickers = stickers as [ScanFaceSymbol, ScanFaceSymbol, ScanFaceSymbol]
    if (!validCornerKeys.has(cornerKey(cornerStickers))) {
      invalidCorners.push({
        faces: corner.faces,
        position: corner.position,
        stickers: cornerStickers,
        targets: corner.stickers.map(([slot, index]) => ({ index, slot })) as [
          EvenCubeCornerStickerTarget,
          EvenCubeCornerStickerTarget,
          EvenCubeCornerStickerTarget,
        ],
      })
    }
  }

  return { invalidCorners, ok: invalidCorners.length === 0 }
}

export function rotateEvenCubeDrafts(
  drafts: ScanFaceDrafts,
  rotations: EvenCubeFaceRotations,
): ScanFaceDrafts {
  return Object.fromEntries(
    scanFaceOrder.map(({ symbol }) => {
      const draft = drafts[symbol]
      return [
        symbol,
        {
          ...draft,
          stickers: rotateEvenCubeStickers(draft.stickers, rotations[symbol] ?? 0),
        },
      ]
    }),
  ) as ScanFaceDrafts
}

export function createDefaultEvenCubeNetAssignments(): EvenCubeNetAssignments {
  return { ...defaultEvenCubeNetAssignments }
}

export function createDefaultEvenCubeFaceRotations(): EvenCubeFaceRotations {
  return { ...defaultEvenCubeFaceRotations }
}

export function swapEvenCubeNetAssignments(
  assignments: EvenCubeNetAssignments,
  sourceSlot: ScanFaceSymbol,
  targetSlot: ScanFaceSymbol,
): EvenCubeNetAssignments {
  if (sourceSlot === targetSlot) {
    return assignments
  }

  return {
    ...assignments,
    [sourceSlot]: assignments[targetSlot],
    [targetSlot]: assignments[sourceSlot],
  }
}

export function findEvenCubeRotationFit(
  drafts: ScanFaceDrafts,
  assignments: EvenCubeNetAssignments,
  stickersPerFace = scan2StickersPerFace,
): EvenCubeAutoFitResult {
  return findEvenCubeFit(drafts, [assignments], stickersPerFace)
}

export function findEvenCubeFullFit(
  drafts: ScanFaceDrafts,
  stickersPerFace = scan2StickersPerFace,
): EvenCubeAutoFitResult {
  if (!hasEvenCubeExactColorCounts(drafts, stickersPerFace)) {
    return { status: 'none' }
  }

  return findEvenCubeFit(drafts, evenCubeNetAssignmentPermutations(), stickersPerFace)
}

function findEvenCubeFit(
  drafts: ScanFaceDrafts,
  assignmentCandidates: Iterable<EvenCubeNetAssignments>,
  stickersPerFace: number,
): EvenCubeAutoFitResult {
  const capturedFaces = scanFaceOrder.map(({ symbol }) => symbol)
  const rotationValues: readonly EvenCubeFaceRotation[] = [0, 90, 180, 270]
  const solutions: EvenCubeFitSolution[] = []

  function search(
    assignments: EvenCubeNetAssignments,
    index: number,
    rotations: EvenCubeFaceRotations,
  ): boolean {
    if (index === capturedFaces.length) {
      if (!validateEvenCubeScan(drafts, rotations, assignments, stickersPerFace).ok) {
        return false
      }

      solutions.push(evenCubeFitSolution(assignments, rotations))
      return solutions.length >= maxFitSolutions
    }

    if (!partialEvenCubeCornersValid(drafts, assignments, rotations, stickersPerFace)) {
      return false
    }

    const face = capturedFaces[index]
    for (const rotation of rotationValues) {
      if (search(assignments, index + 1, { ...rotations, [face]: rotation })) {
        return true
      }
    }

    return false
  }

  for (const assignments of assignmentCandidates) {
    if (search(assignments, 0, {})) {
      break
    }
  }

  if (solutions.length === 0) {
    return { status: 'none' }
  }

  solutions.sort((left, right) => left.score - right.score)
  const [best, second] = solutions
  if (solutions.length === 1) {
    return { solution: best, status: 'unique' }
  }

  if (second !== undefined && best.score + suggestionScoreGap < second.score) {
    return { solution: best, status: 'suggested' }
  }

  return { alternatives: solutions.length, status: 'ambiguous' }
}

export function evenCubeFitSolution(
  assignments: EvenCubeNetAssignments,
  rotations: EvenCubeFaceRotations,
): EvenCubeFitSolution {
  const changes = evenCubeFitChanges(assignments, rotations)
  return {
    assignments: { ...assignments },
    changes,
    rotations: { ...rotations },
    score: changes.swappedSlots * 100 + changes.rotatedFaces * 25 + changes.rotationQuarterTurns * 5,
  }
}

function evenCubeFitChanges(
  assignments: EvenCubeNetAssignments,
  rotations: EvenCubeFaceRotations,
): EvenCubeFitChanges {
  let swappedSlots = 0
  let rotatedFaces = 0
  let rotationQuarterTurns = 0

  for (const { symbol } of scanFaceOrder) {
    if (assignments[symbol] !== defaultEvenCubeNetAssignments[symbol]) {
      swappedSlots += 1
    }

    const rotation = rotations[symbol] ?? 0
    const defaultRotation = defaultEvenCubeFaceRotations[symbol] ?? 0
    if (rotation !== defaultRotation) {
      rotatedFaces += 1
      rotationQuarterTurns += rotationDistance(rotation, defaultRotation) / 90
    }
  }

  return { rotatedFaces, rotationQuarterTurns, swappedSlots }
}

function rotationDistance(rotation: EvenCubeFaceRotation, defaultRotation: EvenCubeFaceRotation): EvenCubeFaceRotation {
  const clockwiseDistance = Math.abs(rotation - defaultRotation)
  return Math.min(clockwiseDistance, 360 - clockwiseDistance) as EvenCubeFaceRotation
}

function partialEvenCubeCornersValid(
  drafts: ScanFaceDrafts,
  assignments: EvenCubeNetAssignments,
  rotations: EvenCubeFaceRotations,
  stickersPerFace: number,
): boolean {
  for (const corner of evenCubeCornerDefinitions(stickersPerFace)) {
    const stickers: ScanFaceSymbol[] = []
    let cornerComplete = true
    for (const [slot, index] of corner.stickers) {
      const capturedFace = assignments[slot]
      const rotation = rotations[capturedFace]
      if (rotation === undefined) {
        cornerComplete = false
        break
      }

      const displayIndex = displayIndexToPayloadIndex(slot, index)
      const sticker = rotateEvenCubeStickers(drafts[capturedFace].stickers, rotation)[displayIndex]
      if (sticker.symbol === undefined) {
        cornerComplete = false
        break
      }

      stickers.push(sticker.symbol)
    }

    if (cornerComplete && !validCornerSymbols(stickers)) {
      return false
    }
  }

  return true
}

function hasEvenCubeExactColorCounts(drafts: ScanFaceDrafts, stickersPerFace: number): boolean {
  const counts = Object.fromEntries(scanSymbols.map((symbol) => [symbol, 0])) as Record<ScanFaceSymbol, number>
  for (const { symbol } of scanFaceOrder) {
    const draft = drafts[symbol]
    if (!draft.confirmed || !isScanFaceComplete(draft.stickers, stickersPerFace)) {
      return false
    }

    for (const sticker of draft.stickers) {
      if (sticker.symbol === undefined) {
        return false
      }

      counts[sticker.symbol] += 1
    }
  }

  return scanSymbols.every((symbol) => counts[symbol] === stickersPerFace)
}

function validCornerSymbols(stickers: readonly ScanFaceSymbol[]): boolean {
  return validCornerKeys.has(cornerKey(stickers))
}

function evenCubeNetAssignmentPermutations(): EvenCubeNetAssignments[] {
  const slots = scanFaceOrder.map(({ symbol }) => symbol)
  const capturedFaces = slots.slice()
  const assignments: EvenCubeNetAssignments[] = []

  function permute(index: number) {
    if (index === capturedFaces.length) {
      assignments.push(Object.fromEntries(slots.map((slot, slotIndex) => [slot, capturedFaces[slotIndex]])) as EvenCubeNetAssignments)
      return
    }

    for (let swapIndex = index; swapIndex < capturedFaces.length; swapIndex += 1) {
      ;[capturedFaces[index], capturedFaces[swapIndex]] = [capturedFaces[swapIndex], capturedFaces[index]]
      permute(index + 1)
      ;[capturedFaces[index], capturedFaces[swapIndex]] = [capturedFaces[swapIndex], capturedFaces[index]]
    }
  }

  permute(0)
  return assignments
}

export function evenCubeDraftsFromNet(
  drafts: ScanFaceDrafts,
  rotations: EvenCubeFaceRotations,
  assignments: EvenCubeNetAssignments,
): ScanFaceDrafts {
  return Object.fromEntries(
    scanFaceOrder.map(({ symbol: slot }) => {
      const capturedFace = assignments[slot]
      const draft = drafts[capturedFace]

      return [
        slot,
        {
          ...draft,
          stickers: rotateEvenCubeStickers(draft.stickers, rotations[capturedFace] ?? 0),
          symbol: slot,
        },
      ]
    }),
  ) as ScanFaceDrafts
}

export function rotateEvenCubeStickers(
  stickers: readonly ScanSticker[],
  rotation: EvenCubeFaceRotation,
): ScanSticker[] {
  if (rotation === 0) {
    return stickers.slice()
  }

  const gridSize = Math.sqrt(stickers.length)
  if (!Number.isInteger(gridSize)) {
    return stickers.slice()
  }

  switch (rotation) {
    case 90:
      return rotateSquareItems(stickers, gridSize, 90)
    case 180:
      return rotateSquareItems(stickers, gridSize, 180)
    case 270:
      return rotateSquareItems(stickers, gridSize, 270)
  }
}

export function allEvenCubeFacesConfirmed(drafts: ScanFaceDrafts): boolean {
  return scanFaceOrder.every(({ symbol }) => {
    const draft = drafts[symbol]
    return draft.confirmed && isScanFaceComplete(draft.stickers, scan2StickersPerFace)
  })
}

export function evenCubeCornerDefinitions(stickersPerFace = scan2StickersPerFace): readonly CornerDefinition[] {
  const gridSize = Math.sqrt(stickersPerFace)
  if (!Number.isInteger(gridSize) || gridSize < 2) {
    return []
  }

  const topLeft = 0
  const topRight = gridSize - 1
  const bottomLeft = gridSize * (gridSize - 1)
  const bottomRight = stickersPerFace - 1

  return [
    { faces: ['U', 'R', 'F'], position: 'Urf', stickers: [['U', bottomRight], ['R', topLeft], ['F', topRight]] },
    { faces: ['U', 'F', 'L'], position: 'Ufl', stickers: [['U', bottomLeft], ['F', topLeft], ['L', topRight]] },
    { faces: ['U', 'L', 'B'], position: 'Ulb', stickers: [['U', topLeft], ['L', topLeft], ['B', topRight]] },
    { faces: ['U', 'B', 'R'], position: 'Ubr', stickers: [['U', topRight], ['B', topLeft], ['R', topRight]] },
    { faces: ['D', 'F', 'R'], position: 'Dfr', stickers: [['D', topRight], ['F', bottomRight], ['R', bottomLeft]] },
    { faces: ['D', 'L', 'F'], position: 'Dlf', stickers: [['D', topLeft], ['L', bottomRight], ['F', bottomLeft]] },
    { faces: ['D', 'B', 'L'], position: 'Dbl', stickers: [['D', bottomLeft], ['B', bottomRight], ['L', bottomLeft]] },
    { faces: ['D', 'R', 'B'], position: 'Drb', stickers: [['D', bottomRight], ['R', bottomRight], ['B', bottomLeft]] },
  ]
}

export function displayIndexToPayloadIndex(_slot: ScanFaceSymbol, index: number): number {
  return index
}

function rotateSquareItems<T>(items: readonly T[], gridSize: number, rotation: EvenCubeFaceRotation): T[] {
  return Array.from({ length: items.length }, (_, targetIndex) => {
    const row = Math.floor(targetIndex / gridSize)
    const column = targetIndex % gridSize
    let sourceRow = row
    let sourceColumn = column

    if (rotation === 90) {
      sourceRow = gridSize - 1 - column
      sourceColumn = row
    } else if (rotation === 180) {
      sourceRow = gridSize - 1 - row
      sourceColumn = gridSize - 1 - column
    } else if (rotation === 270) {
      sourceRow = column
      sourceColumn = gridSize - 1 - row
    }

    return items[sourceRow * gridSize + sourceColumn]
  })
}

function cornerKey(stickers: readonly ScanFaceSymbol[]): string {
  return stickers.slice().sort().join('')
}
