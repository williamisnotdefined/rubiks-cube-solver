import { describe, expect, it } from 'vitest'
import { generateClockScramble } from '../generators/clock'

describe('generateClockScramble', () => {
  it('generates a deterministic WCA-like clock scramble', () => {
    const scramble = generateClockScramble({ seed: 7 })

    expect(scramble).toBe(generateClockScramble({ seed: 7 }))
    expect(scramble).toContain('y2')
    expect(scramble).toMatch(/UR\d[+-]/)
    expect(scramble).toMatch(/DR\d[+-]/)
    expect(scramble).toMatch(/DL\d[+-]/)
    expect(scramble).toMatch(/UL\d[+-]/)
    expect(scramble).toMatch(/ALL\d[+-]/)
  })

  it('keeps dial values between -5 and 6', () => {
    const amounts = generateClockScramble({ seed: 7 }).match(/\d[+-]/g) ?? []

    expect(amounts.length).toBeGreaterThan(0)
    expect(amounts.every((amount) => Number.parseInt(amount, 10) <= 6)).toBe(true)
  })
})
