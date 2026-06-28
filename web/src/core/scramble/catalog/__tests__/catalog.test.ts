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

  it('keeps all events in the WCA group and records their generator quality', () => {
    expect(scrambleEvents).toHaveLength(17)
    expect(scrambleEvents.every((event) => event.group === 'WCA')).toBe(true)
    expect(scrambleEvents.map((event) => [event.id, event.quality])).toEqual([
      ['333', 'officialRandomState'],
      ['222', 'officialRandomState'],
      ['444', 'wcaLike'],
      ['555', 'wcaLike'],
      ['666', 'wcaLike'],
      ['777', 'wcaLike'],
      ['333bld', 'officialRandomState'],
      ['333fm', 'wcaLike'],
      ['333oh', 'officialRandomState'],
      ['clock', 'wcaLike'],
      ['megaminx', 'wcaLike'],
      ['pyraminx', 'officialRandomState'],
      ['skewb', 'officialRandomState'],
      ['square1', 'officialRandomState'],
      ['444bld', 'wcaLike'],
      ['555bld', 'wcaLike'],
      ['333mbld', 'officialRandomState'],
    ])
  })

  it('assigns puzzle slugs to every event', () => {
    expect(scrambleEvents.map((event) => [event.id, event.puzzleSlug])).toEqual([
      ['333', 'cube-3x3x3'],
      ['222', 'cube-2x2x2'],
      ['444', 'cube-4x4x4'],
      ['555', 'cube-5x5x5'],
      ['666', 'cube-6x6x6'],
      ['777', 'cube-7x7x7'],
      ['333bld', 'cube-3x3x3'],
      ['333fm', 'cube-3x3x3'],
      ['333oh', 'cube-3x3x3'],
      ['clock', 'clock'],
      ['megaminx', 'megaminx'],
      ['pyraminx', 'pyraminx'],
      ['skewb', 'skewb'],
      ['square1', 'square1'],
      ['444bld', 'cube-4x4x4'],
      ['555bld', 'cube-5x5x5'],
      ['333mbld', 'cube-3x3x3'],
    ])
  })

  it('generates a non-empty scramble for every event', () => {
    for (const event of scrambleEvents) {
      expect(generateScrambleForEvent(event.id, 7).scramble.trim()).not.toBe('')
    }
  })
})
