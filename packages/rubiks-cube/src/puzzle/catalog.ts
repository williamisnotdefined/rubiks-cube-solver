export const PuzzleSlugs = Object.freeze({
  Cube2: 'cube-2x2x2',
  Cube3: 'cube-3x3x3',
  Cube4: 'cube-4x4x4',
  Cube5: 'cube-5x5x5',
  Cube6: 'cube-6x6x6',
  Cube7: 'cube-7x7x7',
  Megaminx: 'megaminx',
  Pyraminx: 'pyraminx',
  Square1: 'square1',
  Clock: 'clock',
  Skewb: 'skewb',
});

export type PuzzleSlug = (typeof PuzzleSlugs)[keyof typeof PuzzleSlugs];
export type CubingPuzzleId =
  | '2x2x2'
  | '3x3x3'
  | '4x4x4'
  | '5x5x5'
  | '6x6x6'
  | '7x7x7'
  | 'megaminx'
  | 'pyraminx'
  | 'square1'
  | 'clock'
  | 'skewb';

const CubingPuzzleIds = Object.freeze({
  [PuzzleSlugs.Cube2]: '2x2x2',
  [PuzzleSlugs.Cube3]: '3x3x3',
  [PuzzleSlugs.Cube4]: '4x4x4',
  [PuzzleSlugs.Cube5]: '5x5x5',
  [PuzzleSlugs.Cube6]: '6x6x6',
  [PuzzleSlugs.Cube7]: '7x7x7',
  [PuzzleSlugs.Megaminx]: 'megaminx',
  [PuzzleSlugs.Pyraminx]: 'pyraminx',
  [PuzzleSlugs.Square1]: 'square1',
  [PuzzleSlugs.Clock]: 'clock',
  [PuzzleSlugs.Skewb]: 'skewb',
} satisfies Readonly<Record<PuzzleSlug, CubingPuzzleId>>);

const replaySupportedPuzzleSlugs: ReadonlySet<string> = new Set(Object.values(PuzzleSlugs));

export function isPuzzleSlug(puzzleSlug: string): puzzleSlug is PuzzleSlug {
  return Object.values(PuzzleSlugs).includes(puzzleSlug as PuzzleSlug);
}

export function cubingPuzzleIdForSlug(puzzleSlug: string): CubingPuzzleId | undefined {
  if (!isPuzzleSlug(puzzleSlug)) {
    return undefined;
  }

  return CubingPuzzleIds[puzzleSlug];
}

export function isTwistyReplaySupported(puzzleSlug: string): boolean {
  return replaySupportedPuzzleSlugs.has(puzzleSlug) && cubingPuzzleIdForSlug(puzzleSlug) !== undefined;
}
