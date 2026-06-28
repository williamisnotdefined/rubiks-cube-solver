export type ScrambleGeneratorId =
  | 'bigCubeRandomMove'
  | 'clockWcaLike'
  | 'megaminxWcaLike'
  | 'multiBlindThreeByThree'
  | 'pyraminxRandomMove'
  | 'skewbRandomMove'
  | 'squareOneRandomMove'
  | 'threeByThreeRandomMove'
  | 'twoByTwoRandomMove'

export type ScrambleQuality = 'officialRandomState' | 'wcaLike'
export type ScramblePuzzleSlug =
  | 'clock'
  | 'cube-2x2x2'
  | 'cube-3x3x3'
  | 'cube-4x4x4'
  | 'cube-5x5x5'
  | 'cube-6x6x6'
  | 'cube-7x7x7'
  | 'megaminx'
  | 'pyraminx'
  | 'skewb'
  | 'square1'

export type ScrambleEvent = {
  defaultLength: number
  generator: ScrambleGeneratorId
  group: string
  id: string
  label: string
  puzzle: string
  puzzleSlug: ScramblePuzzleSlug
  quality: ScrambleQuality
}

export type GeneratedScramble = {
  event: ScrambleEvent
  scramble: string
}
