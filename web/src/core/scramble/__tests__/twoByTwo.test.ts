import { describe, expect, it } from 'vitest'
import { generateTwoByTwoScramble, twoByTwoMoveFace } from '../generators/twoByTwo'

describe('generateTwoByTwoScramble', () => {
  it('generates deterministic valid tokens', () => {
    const scramble = generateTwoByTwoScramble({ length: 11, seed: 7 })

    expect(scramble).toBe(generateTwoByTwoScramble({ length: 11, seed: 7 }))
    expect(scramble.split(' ')).toHaveLength(11)
    expect(scramble.split(' ').every((token) => /^[URF]2?'?$/.test(token))).toBe(true)
  })

  it('avoids consecutive moves on the same face', () => {
    const tokens = generateTwoByTwoScramble({ length: 40, seed: 7 }).split(' ')

    for (const [index, token] of tokens.entries()) {
      const previous = tokens[index - 1]

      if (previous !== undefined) {
        expect(twoByTwoMoveFace(token)).not.toBe(twoByTwoMoveFace(previous))
      }
    }
  })
})
