import { describe, expect, it } from 'vitest'
import { generateSquareOneScramble } from '../generators/squareOne'

describe('generateSquareOneScramble', () => {
  it('generates deterministic square-1 pair notation', () => {
    const scramble = generateSquareOneScramble({ length: 15, seed: 7 })
    const pairs = [...scramble.matchAll(/\((-?\d+), (-?\d+)\)/g)]

    expect(scramble).toBe(generateSquareOneScramble({ length: 15, seed: 7 }))
    expect(pairs).toHaveLength(15)
    expect(scramble.split(' / ')).toHaveLength(15)
  })

  it('keeps pair values between -5 and 6', () => {
    const values = [...generateSquareOneScramble({ length: 15, seed: 7 }).matchAll(/-?\d+/g)].map(
      ([value]) => Number(value),
    )

    expect(values.length).toBe(30)
    expect(values.every((value) => value >= -5 && value <= 6)).toBe(true)
  })
})
