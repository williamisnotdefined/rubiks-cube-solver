import { describe, expect, it } from 'vitest'
import { generateThreeByThreeScramble, threeByThreeMoveAxis } from '../generators/threeByThree'

describe('generateThreeByThreeScramble', () => {
  it('generates a deterministic scramble for a seed', () => {
    expect(generateThreeByThreeScramble({ length: 25, seed: 7 })).toBe(
      generateThreeByThreeScramble({ length: 25, seed: 7 }),
    )
  })

  it('generates the requested length', () => {
    expect(generateThreeByThreeScramble({ length: 25, seed: 7 }).split(' ')).toHaveLength(25)
  })

  it('avoids consecutive moves on the same axis', () => {
    const tokens = generateThreeByThreeScramble({ length: 50, seed: 7 }).split(' ')

    for (const [index, token] of tokens.entries()) {
      const previous = tokens[index - 1]

      if (previous !== undefined) {
        expect(threeByThreeMoveAxis(token)).not.toBe(threeByThreeMoveAxis(previous))
      }
    }
  })
})
