import { describe, expect, it } from 'vitest'
import { generatePyraminxScramble, pyraminxMainFace } from '../pyraminx'

describe('generatePyraminxScramble', () => {
  it('generates valid main moves and tips', () => {
    const tokens = generatePyraminxScramble({ length: 10, seed: 7 }).split(' ')

    expect(tokens).toHaveLength(14)
    expect(tokens.every((token) => /^[ULRBulrb]'?$/.test(token))).toBe(true)
  })

  it('avoids consecutive main moves on the same face', () => {
    const mainTokens = generatePyraminxScramble({ length: 40, seed: 7 })
      .split(' ')
      .filter((token) => pyraminxMainFace(token) !== undefined)

    for (const [index, token] of mainTokens.entries()) {
      const previous = mainTokens[index - 1]

      if (previous !== undefined) {
        expect(pyraminxMainFace(token)).not.toBe(pyraminxMainFace(previous))
      }
    }
  })
})
