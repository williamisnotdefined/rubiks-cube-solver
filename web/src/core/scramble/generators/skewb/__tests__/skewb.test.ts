import { describe, expect, it } from 'vitest'
import { generateSkewbScramble, skewbMoveFace } from '../skewb'

describe('generateSkewbScramble', () => {
  it('generates deterministic valid skewb tokens', () => {
    const scramble = generateSkewbScramble({ length: 11, seed: 7 })

    expect(scramble).toBe(generateSkewbScramble({ length: 11, seed: 7 }))
    expect(scramble.split(' ')).toHaveLength(11)
    expect(scramble.split(' ').every((token) => /^[URLB]'?$/.test(token))).toBe(true)
  })

  it('avoids consecutive moves on the same face', () => {
    const tokens = generateSkewbScramble({ length: 40, seed: 7 }).split(' ')

    for (const [index, token] of tokens.entries()) {
      const previous = tokens[index - 1]

      if (previous !== undefined) {
        expect(skewbMoveFace(token)).not.toBe(skewbMoveFace(previous))
      }
    }
  })
})
