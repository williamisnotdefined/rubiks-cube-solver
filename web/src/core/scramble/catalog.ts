import { generateBigCubeScramble } from './generators/bigCube'
import { generateClockScramble } from './generators/clock'
import { generateMegaminxScramble } from './generators/megaminx'
import { generateMultiBlindScramble } from './generators/multiBlind'
import { generatePyraminxScramble } from './generators/pyraminx'
import { generateSkewbScramble } from './generators/skewb'
import { generateSquareOneScramble } from './generators/squareOne'
import { generateThreeByThreeScramble } from './generators/threeByThree'
import { generateTwoByTwoScramble } from './generators/twoByTwo'
import type { GeneratedScramble, ScrambleEvent } from './types'

export const scrambleEvents = [
  {
    defaultLength: 25,
    generator: 'threeByThreeRandomMove',
    group: 'WCA',
    id: '333',
    label: '3x3x3',
    puzzle: '3x3x3',
    puzzleSlug: 'cube-3x3x3',
    quality: 'officialRandomState',
  },
  {
    defaultLength: 11,
    generator: 'twoByTwoRandomMove',
    group: 'WCA',
    id: '222',
    label: '2x2x2',
    puzzle: '2x2x2',
    puzzleSlug: 'cube-2x2x2',
    quality: 'officialRandomState',
  },
  {
    defaultLength: 40,
    generator: 'bigCubeRandomMove',
    group: 'WCA',
    id: '444',
    label: '4x4x4',
    puzzle: '4x4x4',
    puzzleSlug: 'cube-4x4x4',
    quality: 'wcaLike',
  },
  {
    defaultLength: 60,
    generator: 'bigCubeRandomMove',
    group: 'WCA',
    id: '555',
    label: '5x5x5',
    puzzle: '5x5x5',
    puzzleSlug: 'cube-5x5x5',
    quality: 'wcaLike',
  },
  {
    defaultLength: 80,
    generator: 'bigCubeRandomMove',
    group: 'WCA',
    id: '666',
    label: '6x6x6',
    puzzle: '6x6x6',
    puzzleSlug: 'cube-6x6x6',
    quality: 'wcaLike',
  },
  {
    defaultLength: 100,
    generator: 'bigCubeRandomMove',
    group: 'WCA',
    id: '777',
    label: '7x7x7',
    puzzle: '7x7x7',
    puzzleSlug: 'cube-7x7x7',
    quality: 'wcaLike',
  },
  {
    defaultLength: 25,
    generator: 'threeByThreeRandomMove',
    group: 'WCA',
    id: '333bld',
    label: '3x3 BLD',
    puzzle: '3x3x3',
    puzzleSlug: 'cube-3x3x3',
    quality: 'officialRandomState',
  },
  {
    defaultLength: 25,
    generator: 'threeByThreeRandomMove',
    group: 'WCA',
    id: '333fm',
    label: '3x3 FMC',
    puzzle: '3x3x3',
    puzzleSlug: 'cube-3x3x3',
    quality: 'wcaLike',
  },
  {
    defaultLength: 25,
    generator: 'threeByThreeRandomMove',
    group: 'WCA',
    id: '333oh',
    label: '3x3 OH',
    puzzle: '3x3x3',
    puzzleSlug: 'cube-3x3x3',
    quality: 'officialRandomState',
  },
  {
    defaultLength: 0,
    generator: 'clockWcaLike',
    group: 'WCA',
    id: 'clock',
    label: 'Clock',
    puzzle: 'Clock',
    puzzleSlug: 'clock',
    quality: 'wcaLike',
  },
  {
    defaultLength: 70,
    generator: 'megaminxWcaLike',
    group: 'WCA',
    id: 'megaminx',
    label: 'Megaminx',
    puzzle: 'Megaminx',
    puzzleSlug: 'megaminx',
    quality: 'wcaLike',
  },
  {
    defaultLength: 10,
    generator: 'pyraminxRandomMove',
    group: 'WCA',
    id: 'pyraminx',
    label: 'Pyraminx',
    puzzle: 'Pyraminx',
    puzzleSlug: 'pyraminx',
    quality: 'officialRandomState',
  },
  {
    defaultLength: 11,
    generator: 'skewbRandomMove',
    group: 'WCA',
    id: 'skewb',
    label: 'Skewb',
    puzzle: 'Skewb',
    puzzleSlug: 'skewb',
    quality: 'officialRandomState',
  },
  {
    defaultLength: 15,
    generator: 'squareOneRandomMove',
    group: 'WCA',
    id: 'square1',
    label: 'Square-1',
    puzzle: 'Square-1',
    puzzleSlug: 'square1',
    quality: 'officialRandomState',
  },
  {
    defaultLength: 40,
    generator: 'bigCubeRandomMove',
    group: 'WCA',
    id: '444bld',
    label: '4x4 BLD',
    puzzle: '4x4x4',
    puzzleSlug: 'cube-4x4x4',
    quality: 'wcaLike',
  },
  {
    defaultLength: 60,
    generator: 'bigCubeRandomMove',
    group: 'WCA',
    id: '555bld',
    label: '5x5 BLD',
    puzzle: '5x5x5',
    puzzleSlug: 'cube-5x5x5',
    quality: 'wcaLike',
  },
  {
    defaultLength: 5,
    generator: 'multiBlindThreeByThree',
    group: 'WCA',
    id: '333mbld',
    label: '3x3 MBLD',
    puzzle: '3x3x3',
    puzzleSlug: 'cube-3x3x3',
    quality: 'officialRandomState',
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
    scramble: generateScramble(event, seed),
  }
}

function generateScramble(event: ScrambleEvent, seed?: number): string {
  switch (event.generator) {
    case 'bigCubeRandomMove':
      return generateBigCubeScramble({ length: event.defaultLength, puzzle: event.puzzle, seed })
    case 'clockWcaLike':
      return generateClockScramble({ seed })
    case 'megaminxWcaLike':
      return generateMegaminxScramble({ seed })
    case 'multiBlindThreeByThree':
      return generateMultiBlindScramble({ count: event.defaultLength, seed })
    case 'pyraminxRandomMove':
      return generatePyraminxScramble({ length: event.defaultLength, seed })
    case 'skewbRandomMove':
      return generateSkewbScramble({ length: event.defaultLength, seed })
    case 'squareOneRandomMove':
      return generateSquareOneScramble({ length: event.defaultLength, seed })
    case 'threeByThreeRandomMove':
      return generateThreeByThreeScramble({ length: event.defaultLength, seed })
    case 'twoByTwoRandomMove':
      return generateTwoByTwoScramble({ length: event.defaultLength, seed })
    default:
      return exhaustiveGeneratorCheck(event.generator)
  }
}

function exhaustiveGeneratorCheck(generator: never): never {
  throw new Error(`unsupported scramble generator: ${generator}`)
}
