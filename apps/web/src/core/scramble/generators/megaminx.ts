import { randomSeed, seededRandom, type RandomSource } from '../random'

type GenerateMegaminxOptions = {
  lines?: number
  random?: RandomSource
  seed?: number
}

export function generateMegaminxScramble({
  lines = 7,
  random,
  seed,
}: GenerateMegaminxOptions = {}): string {
  const rng = random ?? seededRandom(seed ?? randomSeed())
  const scrambleLines: string[] = []

  for (let line = 0; line < lines; line += 1) {
    const tokens: string[] = []

    for (let turn = 0; turn < 10; turn += 1) {
      const face = turn % 2 === 0 ? 'R' : 'D'
      tokens.push(`${face}${megaminxDirection(rng)}`)
    }

    tokens.push(rng.nextIndex(2) === 0 ? 'U' : "U'")
    scrambleLines.push(tokens.join(' '))
  }

  return scrambleLines.join('\n')
}

function megaminxDirection(random: RandomSource): '++' | '--' {
  return random.nextIndex(2) === 0 ? '++' : '--'
}
