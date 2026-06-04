import type { ScanSessionResult } from '@api/scan'
import type { ScanFaceSymbol } from '@api/solver/types'
import { scanFaceOrder } from './scanState'

export type BackendReviewTargets = {
  manualTargets: Partial<Record<ScanFaceSymbol, number[]>>
  rescanFaces: ScanFaceSymbol[]
}

export function emptyBackendReviewTargets(): BackendReviewTargets {
  return { manualTargets: {}, rescanFaces: [] }
}

export function isBackendReviewFace(targets: BackendReviewTargets, symbol: ScanFaceSymbol): boolean {
  return targets.rescanFaces.includes(symbol) || (targets.manualTargets[symbol]?.length ?? 0) > 0
}

export function removeBackendReviewFace(
  targets: BackendReviewTargets,
  symbol: ScanFaceSymbol,
): BackendReviewTargets {
  const manualTargets = { ...targets.manualTargets }
  delete manualTargets[symbol]

  return {
    manualTargets,
    rescanFaces: targets.rescanFaces.filter((face) => face !== symbol),
  }
}

export function removeBackendManualTarget(
  targets: BackendReviewTargets,
  symbol: ScanFaceSymbol,
  index: number,
): BackendReviewTargets {
  const currentTargets = targets.manualTargets[symbol]
  if (currentTargets === undefined) {
    return targets
  }

  const nextTargets = currentTargets.filter((targetIndex) => targetIndex !== index)
  if (nextTargets.length === currentTargets.length) {
    return targets
  }

  const manualTargets = { ...targets.manualTargets }
  if (nextTargets.length === 0) {
    delete manualTargets[symbol]
  } else {
    manualTargets[symbol] = nextTargets
  }

  return { ...targets, manualTargets }
}

export function backendReviewTargetsFromSessionResult(result: ScanSessionResult): BackendReviewTargets {
  const manualTargets: BackendReviewTargets['manualTargets'] = {}

  for (const target of result.manualTargets) {
    manualTargets[target.face] = [...new Set([...(manualTargets[target.face] ?? []), ...target.stickers])]
  }

  return {
    manualTargets,
    rescanFaces: result.rescanFaces,
  }
}

export function firstBackendReviewFace(targets: BackendReviewTargets): ScanFaceSymbol | undefined {
  return targets.rescanFaces[0] ?? scanFaceOrder.find(({ symbol }) => isBackendReviewFace(targets, symbol))?.symbol
}
