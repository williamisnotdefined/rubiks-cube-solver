import { randomSeed, seededRandom, type RandomSource } from '../random'

type GenerateSquareOneOptions = {
  length?: number
  random?: RandomSource
  seed?: number
}

export function generateSquareOneScramble({
  length = 15,
  random,
  seed,
}: GenerateSquareOneOptions = {}): string {
  const rng = random ?? seededRandom(seed ?? randomSeed())
  const tokens: string[] = []

  for (let index = 0; index < length; index += 1) {
    tokens.push(`(${squareOneAmount(rng)}, ${squareOneAmount(rng)})`)

    if (index < length - 1) {
      tokens.push('/')
    }
  }

  return tokens.join(' ')
}

export function squareOneAmount(random: RandomSource): number {
  return random.nextIndex(12) - 5
}
