import { randomSeed, seededRandom, type RandomSource } from '../random'

const frontDials = ['UR', 'DR', 'DL', 'UL', 'U', 'R', 'D', 'L', 'ALL'] as const
const backDials = ['U', 'R', 'D', 'L', 'ALL'] as const

type GenerateClockOptions = {
  random?: RandomSource
  seed?: number
}

export function generateClockScramble({ random, seed }: GenerateClockOptions = {}): string {
  const rng = random ?? seededRandom(seed ?? randomSeed())
  const front = frontDials.map((dial) => `${dial}${clockAmount(rng)}`)
  const back = backDials.map((dial) => `${dial}${clockAmount(rng)}`)

  return [...front, 'y2', ...back].join(' ')
}

export function clockAmount(random: RandomSource): string {
  const amount = random.nextIndex(12) - 5
  const sign = amount < 0 ? '-' : '+'

  return `${Math.abs(amount)}${sign}`
}
