import { randomScrambleForEvent } from 'cubing/scramble'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { scrambleEvents } from '../../catalog'
import { cubingEventIdsByTimerEvent, generateHighQualityScrambleForEvent } from '../highQuality'

vi.mock('cubing/scramble', () => ({
  randomScrambleForEvent: vi.fn(),
}))

vi.mock('cubing/search', () => ({
  setSearchDebug: vi.fn(),
}))

const randomScrambleForEventMock = vi.mocked(randomScrambleForEvent)
type CubingScramble = Awaited<ReturnType<typeof randomScrambleForEvent>>

const expectedCubingEventsByTimerEvent = {
  '222': '222',
  '333': '333',
  '333bld': '333bf',
  '333fm': '333fm',
  '333mbld': '333bf',
  '333oh': '333oh',
  '444': '444',
  '444bld': '444bf',
  '555': '555',
  '555bld': '555bf',
  '666': '666',
  '777': '777',
  clock: 'clock',
  megaminx: 'minx',
  pyraminx: 'pyram',
  skewb: 'skewb',
  square1: 'sq1',
} as const

describe('generateHighQualityScrambleForEvent', () => {
  beforeEach(() => {
    randomScrambleForEventMock.mockReset()
  })

  it('covers every timer event with an explicit cubing provider', () => {
    expect(cubingEventIdsByTimerEvent).toEqual(expectedCubingEventsByTimerEvent)
    expect(Object.keys(cubingEventIdsByTimerEvent).sort()).toEqual(
      scrambleEvents.map((event) => event.id).sort(),
    )
  })

  it.each(Object.entries(expectedCubingEventsByTimerEvent).filter(([eventId]) => eventId !== '333mbld'))(
    'maps %s to cubing event %s',
    async (eventId, cubingEventId) => {
      randomScrambleForEventMock.mockResolvedValue(scrambleAlg(`${cubingEventId}-scramble`))

      const scramble = await generateHighQualityScrambleForEvent(eventId)

      expect(scramble.event.id).toBe(eventId)
      expect(scramble.scramble).toBe(`${cubingEventId}-scramble`)
      expect(randomScrambleForEventMock).toHaveBeenCalledWith(cubingEventId)
    },
  )

  it('generates numbered 3x3 blind scrambles for multi-blind', async () => {
    randomScrambleForEventMock.mockImplementation(async () => (
      scrambleAlg(`scramble-${randomScrambleForEventMock.mock.calls.length}`)
    ))

    const scramble = await generateHighQualityScrambleForEvent('333mbld')

    expect(scramble.event.id).toBe('333mbld')
    expect(scramble.scramble.split('\n')).toEqual([
      '1. scramble-1',
      '2. scramble-2',
      '3. scramble-3',
      '4. scramble-4',
      '5. scramble-5',
    ])
    expect(randomScrambleForEventMock).toHaveBeenCalledTimes(5)
    expect(randomScrambleForEventMock).toHaveBeenCalledWith('333bf')
  })

  it('rejects instead of falling back to a weaker local generator when cubing rejects', async () => {
    randomScrambleForEventMock.mockRejectedValue(new Error('worker unavailable'))

    await expect(generateHighQualityScrambleForEvent('pyraminx')).rejects.toThrow('worker unavailable')
  })

  it('rejects empty provider output', async () => {
    randomScrambleForEventMock.mockResolvedValue(scrambleAlg(' '))

    await expect(generateHighQualityScrambleForEvent('skewb')).rejects.toThrow(
      'Competition-quality scramble provider returned an empty skewb scramble',
    )
  })
})

function scrambleAlg(value: string): CubingScramble {
  return {
    toString: () => value,
  } as unknown as CubingScramble
}
