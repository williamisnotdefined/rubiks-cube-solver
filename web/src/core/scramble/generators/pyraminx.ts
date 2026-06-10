import { randomSeed, seededRandom, type RandomSource } from '../random'

const mainFaces = ['U', 'L', 'R', 'B'] as const
const tipFaces = ['u', 'l', 'r', 'b'] as const
const suffixes = ['', "'"] as const

type GeneratePyraminxOptions = {
  length?: number
  random?: RandomSource
  seed?: number
}

export function generatePyraminxScramble({
  length = 10,
  random,
  seed,
}: GeneratePyraminxOptions = {}): string {
  const rng = random ?? seededRandom(seed ?? randomSeed())
  const scramble: string[] = []
  let previousFace: string | undefined

  while (scramble.length < length) {
    const face = mainFaces[rng.nextIndex(mainFaces.length)]

    if (face === previousFace) {
      continue
    }

    previousFace = face
    scramble.push(`${face}${suffixes[rng.nextIndex(suffixes.length)]}`)
  }

  for (const tip of tipFaces) {
    scramble.push(`${tip}${suffixes[rng.nextIndex(suffixes.length)]}`)
  }

  return scramble.join(' ')
}

export function pyraminxMainFace(move: string): string | undefined {
  return mainFaces.find((face) => face === move[0])
}
