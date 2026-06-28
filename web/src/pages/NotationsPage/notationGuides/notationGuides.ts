export type NotationPuzzleId =
  | '2x2'
  | '3x3'
  | '4x4'
  | '5x5'
  | '6x6'
  | '7x7'
  | 'clock'
  | 'megaminx'
  | 'pyraminx'
  | 'skewb'
  | 'square-1'

export type NotationPuzzleGroup = {
  id: string
  titleKey: string
  puzzles: NotationGuide[]
}

export type NotationGuide = {
  id: NotationPuzzleId
  path: string
  puzzle: string
  visualization?: NotationVisualization
}

export type NotationVisualization =
  | {
    actions: readonly NotationVisualizationAction[]
    cubeType: 'Two' | 'Three' | 'Four' | 'Five' | 'Six' | 'Seven'
    kind: 'cube'
  }
  | {
    actions: readonly NotationVisualizationAction[]
    kind: 'megaminx' | 'pyraminx' | 'square1'
  }

export type NotationVisualizationAction = string | {
  label: string
  move: string
}

const twoByTwoActions = ['R', "R'", 'R2', 'L', "L'", 'L2', 'U', "U'", 'F', 'x', 'y', 'z'] as const
const threeByThreeActions = ['R', "R'", 'R2', 'L', "L'", 'L2', 'U', "U'", 'F', 'M', "M'", 'E', "E'", 'S', "S'", 'Rw', "Rw'", 'x', 'y', 'z'] as const
const bigCubeActions = ['R', "R'", 'R2', 'L', "L'", 'L2', 'U', "U'", 'F', 'Rw', "Rw'", 'Uw', "Uw'", '2R', "2R'", '3Rw', "3Rw'"] as const
const pyraminxActions = ['U', "U'", 'L', "L'", 'R', "R'", 'B', "B'", 'u', "u'", 'l', "l'", 'r', "r'", 'b', "b'"] as const
const squareOneActions = [
  '(1,0)',
  '(-1,0)',
  '(2,0)',
  '(-2,0)',
  '(3,0)',
  '(-3,0)',
  '(4,0)',
  '(-4,0)',
  '(5,0)',
  '(-5,0)',
  '(6,0)',
  '(0,1)',
  '(0,-1)',
  '(0,2)',
  '(0,-2)',
  '(0,3)',
  '(0,-3)',
  '(0,4)',
  '(0,-4)',
  '(0,5)',
  '(0,-5)',
  '(0,6)',
  '(1,-1)',
  '(-1,1)',
  '/',
] as const

const megaminxMoveSuffixes = ['', "'", '2', "2'"] as const
const megaminxVisualFaces = [
  { label: 'U', move: 'U' },
  { label: 'F', move: 'F' },
  { label: 'R', move: 'A' },
  { label: 'L', move: 'R' },
  { label: 'BR', move: 'L' },
  { label: 'BL', move: 'D' },
  { label: 'B', move: 'G' },
  { label: 'D', move: 'E' },
  { label: 'DR', move: 'B' },
  { label: 'DL', move: 'H' },
  { label: 'DBR', move: 'I' },
  { label: 'DBL', move: 'C' },
] as const
const megaminxActions: readonly NotationVisualizationAction[] = [
  ...megaminxVisualFaces.flatMap(({ label, move }) =>
    megaminxMoveSuffixes.map((suffix): NotationVisualizationAction => {
      const actionLabel = `${label}${suffix}`
      const actionMove = `${move}${suffix}`

      return actionLabel === actionMove ? actionLabel : { label: actionLabel, move: actionMove }
    }),
  ),
  'R++',
  'R--',
  'D++',
  'D--',
]

export const notationGuides: NotationGuide[] = [
  {
    id: '2x2',
    path: '/notations/2x2',
    puzzle: '2x2',
    visualization: { actions: twoByTwoActions, cubeType: 'Two', kind: 'cube' },
  },
  {
    id: '3x3',
    path: '/notations/3x3',
    puzzle: '3x3',
    visualization: { actions: threeByThreeActions, cubeType: 'Three', kind: 'cube' },
  },
  {
    id: '4x4',
    path: '/notations/4x4',
    puzzle: '4x4',
    visualization: { actions: bigCubeActions, cubeType: 'Four', kind: 'cube' },
  },
  {
    id: '5x5',
    path: '/notations/5x5',
    puzzle: '5x5',
    visualization: { actions: bigCubeActions, cubeType: 'Five', kind: 'cube' },
  },
  {
    id: '6x6',
    path: '/notations/6x6',
    puzzle: '6x6',
    visualization: { actions: bigCubeActions, cubeType: 'Six', kind: 'cube' },
  },
  {
    id: '7x7',
    path: '/notations/7x7',
    puzzle: '7x7',
    visualization: { actions: bigCubeActions, cubeType: 'Seven', kind: 'cube' },
  },
  {
    id: 'pyraminx',
    path: '/notations/pyraminx',
    puzzle: 'Pyraminx',
    visualization: { actions: pyraminxActions, kind: 'pyraminx' },
  },
  {
    id: 'square-1',
    path: '/notations/square-1',
    puzzle: 'Square-1',
    visualization: { actions: squareOneActions, kind: 'square1' },
  },
  {
    id: 'megaminx',
    path: '/notations/megaminx',
    puzzle: 'Megaminx',
    visualization: { actions: megaminxActions, kind: 'megaminx' },
  },
  {
    id: 'skewb',
    path: '/notations/skewb',
    puzzle: 'Skewb',
  },
  {
    id: 'clock',
    path: '/notations/clock',
    puzzle: 'Clock',
  },
]

export const notationPuzzleGroups: NotationPuzzleGroup[] = [
  { id: 'nxn', titleKey: 'notations.groups.nxn', puzzles: notationGuides.slice(0, 6) },
  { id: 'other', titleKey: 'notations.groups.other', puzzles: notationGuides.slice(6) },
]

export function getNotationGuide(puzzleId: string | undefined) {
  return notationGuides.find((guide) => guide.id === puzzleId)
}
