export type AlgorithmCase = {
  algorithm: string
  image: string
  name: string
}

export type AlgorithmPuzzleId = '2x2' | '3x3' | '4x4' | '5x5' | '6x6' | 'megaminx' | 'pyraminx' | 'sq1'

export type AlgorithmPuzzle = {
  id: AlgorithmPuzzleId
  path: string
  title: string
}

export type AlgorithmSetSummary = {
  path: string
  puzzleId: AlgorithmPuzzleId
  routeSlug: string
  sourceLabel: string
  sourceUrl: string
  title: string
}

export type AlgorithmSet = AlgorithmSetSummary & {
  cases: AlgorithmCase[]
}
