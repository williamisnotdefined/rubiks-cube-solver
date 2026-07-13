import { afterEach, describe, expect, it, vi } from 'vitest'
import { randomSeed, seededRandom } from '../random'

describe('scramble random utilities', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('produces deterministic indexes within the requested bounds', () => {
    const first = seededRandom(123)
    const second = seededRandom(123)
    const firstSequence = Array.from({ length: 12 }, () => first.nextIndex(7))
    const secondSequence = Array.from({ length: 12 }, () => second.nextIndex(7))

    expect(firstSequence).toEqual(secondSequence)
    expect(firstSequence.every((value) => value >= 0 && value < 7)).toBe(true)
    expect(seededRandom(999).nextIndex(1)).toBe(0)
  })

  it('normalizes seeds to unsigned 32-bit state', () => {
    expect(seededRandom(-1).nextIndex(1_000)).toBe(seededRandom(0xffff_ffff).nextIndex(1_000))
  })

  it.each([0, -1])('rejects a non-positive upper bound of %s', (upperBound) => {
    expect(() => seededRandom(1).nextIndex(upperBound)).toThrow(
      'upperBound must be greater than zero',
    )
  })

  it('uses cryptographic random values when available', () => {
    const getRandomValues = vi.fn((values: Uint32Array) => {
      values[0] = 0x1234_abcd
      return values
    })
    vi.stubGlobal('crypto', { getRandomValues })

    expect(randomSeed()).toBe(0x1234_abcd)
    expect(getRandomValues).toHaveBeenCalledTimes(1)
    expect(getRandomValues.mock.calls[0]?.[0]).toBeInstanceOf(Uint32Array)
  })

  it('falls back to the current time without cryptographic randomness', () => {
    vi.stubGlobal('crypto', undefined)
    vi.spyOn(Date, 'now').mockReturnValue(12_345)

    expect(randomSeed()).toBe(12_345)
  })
})
