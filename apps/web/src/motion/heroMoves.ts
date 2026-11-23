import type { Movement } from '@rubiks-cube-solver/rubiks-cube/core'

const faces = ['R', 'L', 'U', 'D', 'F', 'B'] as const
const suffixes = ['', "'", '2'] as const

type Face = (typeof faces)[number]

export type HeroMoveGenerator = () => Movement

export const heroScrollStepPx = 140

/**
 * Random-looking but deterministic face turns for the landing hero cube.
 * Consecutive turns never share a face, which also prevents immediate inverses.
 */
export function createHeroMoveGenerator(seed: number): HeroMoveGenerator {
  let state = seed >>> 0
  let previousFace: Face | undefined

  function nextRandom(): number {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state
  }

  return () => {
    const candidates =
      previousFace === undefined ? faces : faces.filter((face) => face !== previousFace)
    const face = candidates[nextRandom() % candidates.length] ?? 'R'
    previousFace = face

    const suffix = suffixes[nextRandom() % suffixes.length] ?? ''

    return `${face}${suffix}` as Movement
  }
}

/**
 * Maps vertical scroll to a reversible prefix of the hero move sequence.
 * Zero scroll is always zero moves, so the cube is solved at the top.
 */
export function targetHeroMoveCount(scrollTop: number): number {
  const distance = Math.max(0, scrollTop)

  return Math.floor(distance / heroScrollStepPx)
}
