import { describe, expect, it } from 'vitest'
import { generateScrambleForEvent, scrambleEvents } from '../catalog'

const expectedWcaEventIds = [
  '333',
  '222',
  '444',
  '555',
  '666',
  '777',
  '333bld',
  '333fm',
  '333oh',
  'clock',
  'megaminx',
  'pyraminx',
  'skewb',
  'square1',
  '444bld',
  '555bld',
  '333mbld',
] as const

describe('WCA scramble catalog', () => {
  it('contains exactly the WCA timer events supported in this phase', () => {
    expect(scrambleEvents.map((event) => event.id)).toEqual(expectedWcaEventIds)
  })

  it('uses unique ids and labels', () => {
    expect(new Set(scrambleEvents.map((event) => event.id)).size).toBe(scrambleEvents.length)
    expect(new Set(scrambleEvents.map((event) => event.label)).size).toBe(scrambleEvents.length)
  })

  it('keeps all events in the WCA group as WCA-like generators', () => {
    expect(scrambleEvents).toHaveLength(17)
    expect(scrambleEvents.every((event) => event.group === 'WCA')).toBe(true)
    expect(scrambleEvents.every((event) => event.quality === 'wcaLike')).toBe(true)
  })

  it('generates a non-empty scramble for every event', () => {
    for (const event of scrambleEvents) {
      expect(generateScrambleForEvent(event.id, 7).scramble.trim()).not.toBe('')
    }
  })
})
