export type ScrambleGeneratorId = 'threeByThreeRandomMove'

export type ScrambleEvent = {
  defaultLength: number
  generator: ScrambleGeneratorId
  group: string
  id: string
  label: string
}

export type GeneratedScramble = {
  event: ScrambleEvent
  scramble: string
}
