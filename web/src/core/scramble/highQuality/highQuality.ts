import { scrambleEventById, scrambleEvents } from '../catalog'
import type { GeneratedScramble } from '../types'

type RandomScrambleForEvent = typeof import('cubing/scramble').randomScrambleForEvent
type CubingScramble = Awaited<ReturnType<RandomScrambleForEvent>>
type TimerScrambleEventId = (typeof scrambleEvents)[number]['id']

let randomScrambleForEventPromise: Promise<RandomScrambleForEvent> | undefined

export const cubingEventIdsByTimerEvent = {
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
} as const satisfies Record<TimerScrambleEventId, string>

export async function generateHighQualityScrambleForEvent(eventId: string): Promise<GeneratedScramble> {
  const event = scrambleEventById(eventId)
  const cubingEventId = cubingEventIdFor(event.id)

  if (event.id === '333mbld') {
    return {
      event,
      scramble: await generateMultiBlindScramble(event.defaultLength, cubingEventId),
    }
  }

  const randomScrambleForEvent = await loadRandomScrambleForEvent()
  const scramble = await randomScrambleForEvent(cubingEventId)

  return {
    event,
    scramble: scrambleToString(scramble, event.id),
  }
}

async function generateMultiBlindScramble(count: number, cubingEventId: string): Promise<string> {
  const randomScrambleForEvent = await loadRandomScrambleForEvent()
  const scrambles = await Promise.all(
    Array.from({ length: count }, async (_, index) => {
      const scramble = await randomScrambleForEvent(cubingEventId)

      return `${index + 1}. ${scrambleToString(scramble, '333mbld')}`
    }),
  )

  return scrambles.join('\n')
}

function cubingEventIdFor(eventId: string): string {
  if (isTimerScrambleEventId(eventId)) {
    return cubingEventIdsByTimerEvent[eventId]
  }

  throw new Error(`No competition-quality scramble provider is configured for ${eventId}`)
}

function isTimerScrambleEventId(eventId: string): eventId is TimerScrambleEventId {
  return eventId in cubingEventIdsByTimerEvent
}

function scrambleToString(scramble: CubingScramble, eventId: string): string {
  const notation = scramble.toString().trim()

  if (notation === '') {
    throw new Error(`Competition-quality scramble provider returned an empty ${eventId} scramble`)
  }

  return notation
}

function loadRandomScrambleForEvent(): Promise<RandomScrambleForEvent> {
  randomScrambleForEventPromise ??= import('cubing/scramble')
    .then((module) => module.randomScrambleForEvent)

  return randomScrambleForEventPromise
}
