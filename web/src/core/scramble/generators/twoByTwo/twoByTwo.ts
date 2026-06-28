import { randomSeed, seededRandom, type RandomSource } from '../../random'

const faces = ['U', 'R', 'F'] as const
const suffixes = ['', '2', "'"] as const

type GenerateTwoByTwoOptions = {
  length?: number
  random?: RandomSource
  seed?: number
}

export function generateTwoByTwoScramble({
  length = 11,
  random,
  seed,
}: GenerateTwoByTwoOptions = {}): string {
  const rng = random ?? seededRandom(seed ?? randomSeed())
  const scramble: string[] = []
  let previousFace: string | undefined

  while (scramble.length < length) {
    const face = faces[rng.nextIndex(faces.length)]

    if (face === previousFace) {
      continue
    }

    previousFace = face
    scramble.push(`${face}${suffixes[rng.nextIndex(suffixes.length)]}`)
  }

  return scramble.join(' ')
}

export function twoByTwoMoveFace(move: string): string | undefined {
  return faces.find((face) => face === move[0])
}
