import { describe, expect, it } from 'vitest'
import { generateMultiBlindScramble } from '../multiBlind'

describe('generateMultiBlindScramble', () => {
  it('generates deterministic numbered 3x3 scrambles', () => {
    const scramble = generateMultiBlindScramble({ count: 5, seed: 7 })
    const lines = scramble.split('\n')

    expect(scramble).toBe(generateMultiBlindScramble({ count: 5, seed: 7 }))
    expect(lines).toHaveLength(5)
    expect(lines[0]).toMatch(/^1\. \S/)
    expect(lines[4]).toMatch(/^5\. \S/)
  })
})
