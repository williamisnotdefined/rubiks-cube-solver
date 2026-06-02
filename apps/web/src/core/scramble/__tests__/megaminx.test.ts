import { describe, expect, it } from 'vitest'
import { generateMegaminxScramble } from '../generators/megaminx'

describe('generateMegaminxScramble', () => {
  it('generates deterministic multiline WCA-like megaminx scrambles', () => {
    const scramble = generateMegaminxScramble({ seed: 7 })
    const lines = scramble.split('\n')

    expect(scramble).toBe(generateMegaminxScramble({ seed: 7 }))
    expect(lines).toHaveLength(7)
    expect(lines.every((line) => line.split(' ').length === 11)).toBe(true)
    expect(scramble).toMatch(/R(\+\+|--)/)
    expect(scramble).toMatch(/D(\+\+|--)/)
    expect(scramble).toMatch(/U'?/)
  })
})
