export const defaultNotation = ''
export const scramblePlaceholder =
  "R2 D2 F2 D L2 F2 U' R2 D B2 L2 U' B' R' B' R2 B2 L B U'"
export const cube3MaxMovesLimit = 20
export const cube2MaxMovesLimit = 11
export const maxMovesLimit = cube3MaxMovesLimit
export const defaultMaxMoves = 20
export const maxNodesMillionOptions = [10, 15, 20, 25] as const
export const defaultMaxNodesMillion = 10
export const nodesPerMillion = 1_000_000
export const fallbackStrategyId = 'generated-two-phase'

export function maxMovesLimitForPuzzle(puzzleSlug: string): number {
  return puzzleSlug === 'cube-2x2x2' ? cube2MaxMovesLimit : cube3MaxMovesLimit
}
