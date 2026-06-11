import { generateScrambleForEvent, scrambleEventById } from './catalog'
import type { GeneratedScramble } from './types'

type RandomScrambleForEvent = typeof import('cubing/scramble').randomScrambleForEvent

let randomScrambleForEventPromise: Promise<RandomScrambleForEvent> | undefined

const cubingEventIds: Partial<Record<string, string>> = {
  '222': '222',
  '333': '333',
  '333bld': '333bf',
  '333fm': '333fm',
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
} as const satisfies Record<string, string>

export async function generateHighQualityScrambleForEvent(eventId: string): Promise<GeneratedScramble> {
  const event = scrambleEventById(eventId)

  try {
    if (event.id === '333mbld') {
      return {
        event,
        scramble: await generateMultiBlindScramble(event.defaultLength),
      }
    }

    const cubingEventId = cubingEventIds[event.id]

    if (cubingEventId === undefined) {
      return generateScrambleForEvent(event.id)
    }

    const randomScrambleForEvent = await loadRandomScrambleForEvent()
    const scramble = await randomScrambleForEvent(cubingEventId)

    return {
      event,
      scramble: scramble.toString(),
    }
  } catch {
    return generateScrambleForEvent(event.id)
  }
}

async function generateMultiBlindScramble(count: number): Promise<string> {
  const randomScrambleForEvent = await loadRandomScrambleForEvent()
  const scrambles = await Promise.all(
    Array.from({ length: count }, async (_, index) => {
      const scramble = await randomScrambleForEvent('333bf')

      return `${index + 1}. ${scramble.toString()}`
    }),
  )

  return scrambles.join('\n')
}

function loadRandomScrambleForEvent(): Promise<RandomScrambleForEvent> {
  randomScrambleForEventPromise ??= import('cubing/scramble')
    .then((module) => module.randomScrambleForEvent)

  return randomScrambleForEventPromise
}
