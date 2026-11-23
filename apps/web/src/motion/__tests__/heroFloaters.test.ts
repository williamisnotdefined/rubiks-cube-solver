import { describe, expect, it } from 'vitest'
import { createFloaterConfigs } from '../heroFloaters'

describe('createFloaterConfigs', () => {
  it('is deterministic for a given seed', () => {
    expect(createFloaterConfigs(8, 42)).toEqual(createFloaterConfigs(8, 42))
  })

  it('keeps motion and reaction values inside the intended ranges', () => {
    for (const config of createFloaterConfigs(12, 7)) {
      expect(Math.abs(config.amplitudeX)).toBeGreaterThanOrEqual(6)
      expect(Math.abs(config.amplitudeX)).toBeLessThanOrEqual(28)
      expect(Math.abs(config.amplitudeY)).toBeGreaterThanOrEqual(8)
      expect(Math.abs(config.amplitudeY)).toBeLessThanOrEqual(32)
      expect(config.duration).toBeGreaterThanOrEqual(3.2)
      expect(config.duration).toBeLessThanOrEqual(5.5)
      expect(config.rotation).toBeGreaterThanOrEqual(-12)
      expect(config.rotation).toBeLessThanOrEqual(12)
      expect(config.reaction).toBeGreaterThanOrEqual(0.55)
      expect(config.reaction).toBeLessThanOrEqual(1.15)
      expect(Math.abs(config.pointerX)).toBe(1)
      expect(Math.abs(config.pointerY)).toBe(1)
    }
  })

  it('creates the requested number of floaters', () => {
    expect(createFloaterConfigs(10, 1)).toHaveLength(10)
  })
})
