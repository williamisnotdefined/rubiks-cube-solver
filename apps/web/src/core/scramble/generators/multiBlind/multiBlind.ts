import { randomSeed, seededRandom } from '../../random'
import { generateThreeByThreeScramble } from '../threeByThree'

type GenerateMultiBlindOptions = {
  count?: number
  seed?: number
}

export function generateMultiBlindScramble({
  count = 5,
  seed,
}: GenerateMultiBlindOptions = {}): string {
  const rng = seededRandom(seed ?? randomSeed())
  const scrambles: string[] = []

  for (let index = 1; index <= count; index += 1) {
    scrambles.push(`${index}. ${generateThreeByThreeScramble({ length: 25, random: rng })}`)
  }

  return scrambles.join('\n')
}
