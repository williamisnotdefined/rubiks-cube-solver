import { generateThreeByThreeScramble } from './generators/threeByThree'
import type { GeneratedScramble, ScrambleEvent } from './types'

export const scrambleEvents = [
  {
    defaultLength: 25,
    generator: 'threeByThreeRandomMove',
    group: 'WCA',
    id: '333',
    label: '3x3x3',
  },
  {
    defaultLength: 25,
    generator: 'threeByThreeRandomMove',
    group: 'WCA',
    id: '333oh',
    label: '3x3 OH',
  },
  {
    defaultLength: 25,
    generator: 'threeByThreeRandomMove',
    group: 'WCA',
    id: '333bld',
    label: '3x3 BLD',
  },
] as const satisfies readonly ScrambleEvent[]

export const defaultScrambleEventId = '333'

export function scrambleEventById(eventId: string): ScrambleEvent {
  return scrambleEvents.find((event) => event.id === eventId) ?? scrambleEvents[0]
}

export function generateScrambleForEvent(eventId: string, seed?: number): GeneratedScramble {
  const event = scrambleEventById(eventId)

  return {
    event,
    scramble: generateThreeByThreeScramble({ length: event.defaultLength, seed }),
  }
}
