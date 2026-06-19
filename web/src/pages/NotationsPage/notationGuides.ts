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
  imageAltKey: string
  imageSrc: string
  path: string
  puzzle: string
  sections: NotationSection[]
  sourceLabel?: string
  sourceUrl?: string
  summaryKey: string
  symbols: NotationSymbol[]
}

type NotationSection = {
  bodyKey: string
  titleKey: string
}

type NotationSymbol = {
  example: string
  meaningKey: string
  symbol: string
}

const faceSymbol: NotationSymbol = { example: 'R', meaningKey: 'notations.symbols.face', symbol: 'U D R L F B' }
const counterClockwiseSymbol: NotationSymbol = { example: "R'", meaningKey: 'notations.symbols.counterClockwise', symbol: "'" }
const halfTurnSymbol: NotationSymbol = { example: 'R2', meaningKey: 'notations.symbols.halfTurn', symbol: '2' }
const rotationSymbol: NotationSymbol = { example: 'x y z', meaningKey: 'notations.symbols.rotation', symbol: 'x y z' }
const sliceSymbol: NotationSymbol = { example: 'M', meaningKey: 'notations.symbols.slice', symbol: 'M E S' }
const wideSymbol: NotationSymbol = { example: 'Rw', meaningKey: 'notations.symbols.wide', symbol: 'w' }
const innerLayerSymbol: NotationSymbol = { example: '2R', meaningKey: 'notations.symbols.innerLayer', symbol: '2R' }
const multiLayerSymbol: NotationSymbol = { example: '3Rw', meaningKey: 'notations.symbols.multiLayer', symbol: '3Rw' }
const pyraminxFaceSymbol: NotationSymbol = { example: 'R', meaningKey: 'notations.symbols.pyraminxFace', symbol: 'U L R B' }
const pyraminxTipSymbol: NotationSymbol = { example: 'r', meaningKey: 'notations.symbols.pyraminxTip', symbol: 'u l r b' }
const squareOnePairSymbol: NotationSymbol = { example: '(1,-3)', meaningKey: 'notations.symbols.squareOnePair', symbol: '(x,y)' }
const squareOneSlashSymbol: NotationSymbol = { example: '/', meaningKey: 'notations.symbols.squareOneSlash', symbol: '/' }
const squareOneNegativeSymbol: NotationSymbol = { example: '(-2,0)', meaningKey: 'notations.symbols.squareOneNegative', symbol: '-' }
const megaminxFaceSymbol: NotationSymbol = { example: "U'", meaningKey: 'notations.symbols.megaminxFace', symbol: 'U R D' }
const megaminxDoublePlusSymbol: NotationSymbol = { example: 'R++', meaningKey: 'notations.symbols.megaminxDoublePlus', symbol: '++' }
const megaminxDoubleMinusSymbol: NotationSymbol = { example: 'D--', meaningKey: 'notations.symbols.megaminxDoubleMinus', symbol: '--' }
const skewbFaceSymbol: NotationSymbol = { example: 'R', meaningKey: 'notations.symbols.skewbFace', symbol: 'R L U B' }
const clockPinSymbol: NotationSymbol = { example: 'UR', meaningKey: 'notations.symbols.clockPin', symbol: 'UR DR DL UL' }
const clockDialSymbol: NotationSymbol = { example: 'U3+', meaningKey: 'notations.symbols.clockDial', symbol: '+ / -' }
const clockAllSymbol: NotationSymbol = { example: 'ALL6+', meaningKey: 'notations.symbols.clockAll', symbol: 'ALL' }

export const notationGuides: NotationGuide[] = [
  {
    id: '2x2',
    imageAltKey: 'notations.puzzles.2x2.imageAlt',
    imageSrc: '/notations/2x2.svg',
    path: '/notations/2x2',
    puzzle: '2x2',
    sections: [section('nxnFaces'), section('suffixes'), section('rotations'), section('twoByTwo')],
    summaryKey: 'notations.puzzles.2x2.summary',
    symbols: [faceSymbol, counterClockwiseSymbol, halfTurnSymbol, rotationSymbol],
  },
  {
    id: '3x3',
    imageAltKey: 'notations.puzzles.3x3.imageAlt',
    imageSrc: '/notations/3x3.svg',
    path: '/notations/3x3',
    puzzle: '3x3',
    sections: [section('nxnFaces'), section('suffixes'), section('slices'), section('wideMoves'), section('rotations')],
    summaryKey: 'notations.puzzles.3x3.summary',
    symbols: [faceSymbol, counterClockwiseSymbol, halfTurnSymbol, sliceSymbol, wideSymbol, rotationSymbol],
  },
  {
    id: '4x4',
    imageAltKey: 'notations.puzzles.4x4.imageAlt',
    imageSrc: '/notations/4x4.svg',
    path: '/notations/4x4',
    puzzle: '4x4',
    sections: [section('nxnFaces'), section('wideMoves'), section('bigCubeLayers'), section('parityNotation')],
    summaryKey: 'notations.puzzles.4x4.summary',
    symbols: [faceSymbol, counterClockwiseSymbol, halfTurnSymbol, wideSymbol, innerLayerSymbol],
  },
  {
    id: '5x5',
    imageAltKey: 'notations.puzzles.5x5.imageAlt',
    imageSrc: '/notations/5x5.svg',
    path: '/notations/5x5',
    puzzle: '5x5',
    sections: [section('nxnFaces'), section('wideMoves'), section('bigCubeLayers'), section('oddCubeCenters')],
    summaryKey: 'notations.puzzles.5x5.summary',
    symbols: [faceSymbol, counterClockwiseSymbol, halfTurnSymbol, wideSymbol, multiLayerSymbol],
  },
  {
    id: '6x6',
    imageAltKey: 'notations.puzzles.6x6.imageAlt',
    imageSrc: '/notations/6x6.svg',
    path: '/notations/6x6',
    puzzle: '6x6',
    sections: [section('nxnFaces'), section('wideMoves'), section('bigCubeLayers'), section('evenCubeCenters')],
    summaryKey: 'notations.puzzles.6x6.summary',
    symbols: [faceSymbol, counterClockwiseSymbol, halfTurnSymbol, wideSymbol, multiLayerSymbol],
  },
  {
    id: '7x7',
    imageAltKey: 'notations.puzzles.7x7.imageAlt',
    imageSrc: '/notations/7x7.svg',
    path: '/notations/7x7',
    puzzle: '7x7',
    sections: [section('nxnFaces'), section('wideMoves'), section('bigCubeLayers'), section('oddCubeCenters')],
    summaryKey: 'notations.puzzles.7x7.summary',
    symbols: [faceSymbol, counterClockwiseSymbol, halfTurnSymbol, wideSymbol, multiLayerSymbol],
  },
  {
    id: 'pyraminx',
    imageAltKey: 'notations.puzzles.pyraminx.imageAlt',
    imageSrc: '/notations/pyraminx.jpg',
    path: '/notations/pyraminx',
    puzzle: 'Pyraminx',
    sections: [section('pyraminxFaces'), section('pyraminxTips'), section('suffixes')],
    sourceLabel: 'Wikimedia Commons',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Pyraminx.jpg',
    summaryKey: 'notations.puzzles.pyraminx.summary',
    symbols: [pyraminxFaceSymbol, pyraminxTipSymbol, counterClockwiseSymbol, halfTurnSymbol],
  },
  {
    id: 'square-1',
    imageAltKey: 'notations.puzzles.square-1.imageAlt',
    imageSrc: '/notations/square-1.jpg',
    path: '/notations/square-1',
    puzzle: 'Square-1',
    sections: [section('squareOnePairs'), section('squareOneSlash'), section('squareOneShape')],
    sourceLabel: 'Wikimedia Commons',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Square-1_solved.jpg',
    summaryKey: 'notations.puzzles.square-1.summary',
    symbols: [squareOnePairSymbol, squareOneSlashSymbol, squareOneNegativeSymbol],
  },
  {
    id: 'megaminx',
    imageAltKey: 'notations.puzzles.megaminx.imageAlt',
    imageSrc: '/notations/megaminx.jpg',
    path: '/notations/megaminx',
    puzzle: 'Megaminx',
    sections: [section('megaminxFaces'), section('megaminxDoubleTurns'), section('suffixes')],
    sourceLabel: 'Wikimedia Commons',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Megaminx.jpg',
    summaryKey: 'notations.puzzles.megaminx.summary',
    symbols: [megaminxFaceSymbol, megaminxDoublePlusSymbol, megaminxDoubleMinusSymbol, counterClockwiseSymbol],
  },
  {
    id: 'skewb',
    imageAltKey: 'notations.puzzles.skewb.imageAlt',
    imageSrc: '/notations/skewb.jpg',
    path: '/notations/skewb',
    puzzle: 'Skewb',
    sections: [section('skewbCorners'), section('skewbGrip'), section('suffixes')],
    sourceLabel: 'Wikimedia Commons',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Skewb.jpg',
    summaryKey: 'notations.puzzles.skewb.summary',
    symbols: [skewbFaceSymbol, counterClockwiseSymbol, halfTurnSymbol],
  },
  {
    id: 'clock',
    imageAltKey: 'notations.puzzles.clock.imageAlt',
    imageSrc: '/notations/clock.jpg',
    path: '/notations/clock',
    puzzle: 'Clock',
    sections: [section('clockPins'), section('clockDials'), section('clockFlip')],
    sourceLabel: 'Wikimedia Commons',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Rubik%27s_Clock.jpg',
    summaryKey: 'notations.puzzles.clock.summary',
    symbols: [clockPinSymbol, clockDialSymbol, clockAllSymbol],
  },
]

export const notationPuzzleGroups: NotationPuzzleGroup[] = [
  { id: 'nxn', titleKey: 'notations.groups.nxn', puzzles: notationGuides.slice(0, 6) },
  { id: 'other', titleKey: 'notations.groups.other', puzzles: notationGuides.slice(6) },
]

export function getNotationGuide(puzzleId: string | undefined) {
  return notationGuides.find((guide) => guide.id === puzzleId)
}

function section(id: string): NotationSection {
  return {
    bodyKey: `notations.sections.${id}.body`,
    titleKey: `notations.sections.${id}.title`,
  }
}
