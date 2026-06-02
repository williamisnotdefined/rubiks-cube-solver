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

export type ScrambleEvent = {
  defaultLength: number
  generator: ScrambleGeneratorId
  group: string
  id: string
  label: string
  puzzle: string
  quality: ScrambleQuality
}

export type GeneratedScramble = {
  event: ScrambleEvent
  scramble: string
}
