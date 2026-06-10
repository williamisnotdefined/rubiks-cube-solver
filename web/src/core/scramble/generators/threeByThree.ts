import { randomSeed, seededRandom, type RandomSource } from '../random'

const moves = [
  { axis: 'UD', face: 'U' },
  { axis: 'UD', face: 'D' },
  { axis: 'LR', face: 'L' },
  { axis: 'LR', face: 'R' },
  { axis: 'FB', face: 'F' },
  { axis: 'FB', face: 'B' },
] as const

const suffixes = ['', '2', "'"] as const

type GenerateThreeByThreeOptions = {
  length?: number
  random?: RandomSource
  seed?: number
}

export function generateThreeByThreeScramble({
  length = 25,
  random,
  seed,
}: GenerateThreeByThreeOptions = {}): string {
  const rng = random ?? seededRandom(seed ?? randomSeed())
  const scramble: string[] = []
  let previousAxis: string | undefined

  while (scramble.length < length) {
    const move = moves[rng.nextIndex(moves.length)]

    if (move.axis === previousAxis) {
      continue
    }

    previousAxis = move.axis
    scramble.push(`${move.face}${suffixes[rng.nextIndex(suffixes.length)]}`)
  }

  return scramble.join(' ')
}

export function threeByThreeMoveAxis(move: string): string | undefined {
  return moves.find((candidate) => candidate.face === move[0])?.axis
}
