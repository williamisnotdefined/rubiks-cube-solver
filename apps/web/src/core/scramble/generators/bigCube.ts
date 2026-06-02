import { randomSeed, seededRandom, type RandomSource } from '../random'

const suffixes = ['', '2', "'"] as const

type BigCubeMove = {
  axis: 'FB' | 'LR' | 'UD'
  notation: string
}

type GenerateBigCubeOptions = {
  length?: number
  puzzle: string
  random?: RandomSource
  seed?: number
}

export function generateBigCubeScramble({
  length = 40,
  puzzle,
  random,
  seed,
}: GenerateBigCubeOptions): string {
  const rng = random ?? seededRandom(seed ?? randomSeed())
  const moves = bigCubeMoves(bigCubeSizeFromPuzzle(puzzle))
  const scramble: string[] = []
  let previousAxis: BigCubeMove['axis'] | undefined

  while (scramble.length < length) {
    const move = moves[rng.nextIndex(moves.length)]

    if (move.axis === previousAxis) {
      continue
    }

    previousAxis = move.axis
    scramble.push(`${move.notation}${suffixes[rng.nextIndex(suffixes.length)]}`)
  }

  return scramble.join(' ')
}

export function bigCubeSizeFromPuzzle(puzzle: string): number {
  const match = /^(\d+)x\d+x\d+$/.exec(puzzle)

  if (match === null) {
    return 4
  }

  return Number(match[1])
}

export function bigCubeMoveAxis(move: string): string | undefined {
  const normalized = move.replace(/^[0-9]+/, '')
  const face = normalized[0]

  if (face === 'U' || face === 'D') {
    return 'UD'
  }

  if (face === 'L' || face === 'R') {
    return 'LR'
  }

  if (face === 'F' || face === 'B') {
    return 'FB'
  }

  return undefined
}

function bigCubeMoves(size: number): BigCubeMove[] {
  const moves: BigCubeMove[] = [
    { axis: 'UD', notation: 'U' },
    { axis: 'UD', notation: 'D' },
    { axis: 'LR', notation: 'L' },
    { axis: 'LR', notation: 'R' },
    { axis: 'FB', notation: 'F' },
    { axis: 'FB', notation: 'B' },
    { axis: 'UD', notation: 'Uw' },
    { axis: 'UD', notation: 'Dw' },
    { axis: 'LR', notation: 'Lw' },
    { axis: 'LR', notation: 'Rw' },
    { axis: 'FB', notation: 'Fw' },
    { axis: 'FB', notation: 'Bw' },
  ]

  if (size >= 6) {
    moves.push(
      { axis: 'UD', notation: '3Uw' },
      { axis: 'UD', notation: '3Dw' },
      { axis: 'LR', notation: '3Lw' },
      { axis: 'LR', notation: '3Rw' },
      { axis: 'FB', notation: '3Fw' },
      { axis: 'FB', notation: '3Bw' },
    )
  }

  return moves
}
