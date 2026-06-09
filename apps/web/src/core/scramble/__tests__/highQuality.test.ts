import { randomScrambleForEvent } from 'cubing/scramble'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { generateHighQualityScrambleForEvent } from '../highQuality'

vi.mock('cubing/scramble', () => ({
  randomScrambleForEvent: vi.fn(),
}))

const randomScrambleForEventMock = vi.mocked(randomScrambleForEvent)
type CubingScramble = Awaited<ReturnType<typeof randomScrambleForEvent>>

describe('generateHighQualityScrambleForEvent', () => {
  beforeEach(() => {
    randomScrambleForEventMock.mockReset()
  })

  it.each([
    ['333', '333'],
    ['333bld', '333bf'],
    ['333fm', '333fm'],
    ['333oh', '333oh'],
    ['clock', 'clock'],
    ['megaminx', 'minx'],
    ['pyraminx', 'pyram'],
    ['skewb', 'skewb'],
    ['square1', 'sq1'],
    ['444bld', '444bf'],
    ['555bld', '555bf'],
  ] as const)('maps %s to cubing event %s', async (eventId, cubingEventId) => {
    randomScrambleForEventMock.mockResolvedValue(scrambleAlg(`${cubingEventId}-scramble`))

    const scramble = await generateHighQualityScrambleForEvent(eventId)

    expect(scramble.event.id).toBe(eventId)
    expect(scramble.scramble).toBe(`${cubingEventId}-scramble`)
    expect(randomScrambleForEventMock).toHaveBeenCalledWith(cubingEventId)
  })

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

  it('falls back to the local generator when cubing rejects', async () => {
    randomScrambleForEventMock.mockRejectedValue(new Error('worker unavailable'))

    const scramble = await generateHighQualityScrambleForEvent('pyraminx')

    expect(scramble.event.id).toBe('pyraminx')
    expect(scramble.scramble.trim()).not.toBe('')
  })
})

function scrambleAlg(value: string): CubingScramble {
  return {
    toString: () => value,
  } as unknown as CubingScramble
}
