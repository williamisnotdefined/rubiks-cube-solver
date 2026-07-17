import { speedCubeDbSetSummaries } from '../speedCubeDbSetSummaries'
import type { AlgorithmPuzzle, AlgorithmPuzzleId, AlgorithmSetSummary } from '../types'

const jpermBase = 'https://jperm.net'

export const algorithmPuzzles: AlgorithmPuzzle[] = [
  { id: '3x3', path: '/algorithms/3x3', title: '3x3' },
  { id: '2x2', path: '/algorithms/2x2', title: '2x2' },
  { id: '4x4', path: '/algorithms/4x4', title: '4x4' },
  { id: '5x5', path: '/algorithms/5x5', title: '5x5' },
  { id: '6x6', path: '/algorithms/6x6', title: '6x6' },
  { id: 'sq1', path: '/algorithms/sq1', title: 'Square-1' },
  { id: 'pyraminx', path: '/algorithms/pyraminx', title: 'Pyraminx' },
  { id: 'megaminx', path: '/algorithms/megaminx', title: 'Megaminx' },
]

export const jpermSetSummaries: AlgorithmSetSummary[] = [
  {
    path: '/algorithms/3x3/oll',
    puzzleId: '3x3',
    routeSlug: 'oll',
    sourceLabel: 'JPerm OLL',
    sourceUrl: `${jpermBase}/algs/oll`,
    title: '3x3 OLL',
  },
  {
    path: '/algorithms/3x3/pll',
    puzzleId: '3x3',
    routeSlug: 'pll',
    sourceLabel: 'JPerm PLL',
    sourceUrl: `${jpermBase}/algs/pll`,
    title: '3x3 PLL',
  },
  {
    path: '/algorithms/3x3/2look-oll',
    puzzleId: '3x3',
    routeSlug: '2look-oll',
    sourceLabel: 'JPerm Beginner OLL',
    sourceUrl: `${jpermBase}/algs/2look/oll`,
    title: '3x3 2-Look OLL',
  },
  {
    path: '/algorithms/3x3/2look-pll',
    puzzleId: '3x3',
    routeSlug: '2look-pll',
    sourceLabel: 'JPerm Beginner PLL',
    sourceUrl: `${jpermBase}/algs/2look/pll`,
    title: '3x3 2-Look PLL',
  },
  {
    path: '/algorithms/3x3/coll',
    puzzleId: '3x3',
    routeSlug: 'coll',
    sourceLabel: 'JPerm COLL',
    sourceUrl: `${jpermBase}/algs/coll`,
    title: '3x3 COLL',
  },
  {
    path: '/algorithms/3x3/winter-variation',
    puzzleId: '3x3',
    routeSlug: 'winter-variation',
    sourceLabel: 'JPerm Winter Variation',
    sourceUrl: `${jpermBase}/algs/wv`,
    title: '3x3 Winter Variation',
  },
  {
    path: '/algorithms/3x3/oh-oll',
    puzzleId: '3x3',
    routeSlug: 'oh-oll',
    sourceLabel: 'JPerm OH OLL',
    sourceUrl: `${jpermBase}/algs/oh/oll`,
    title: '3x3 OH OLL',
  },
  {
    path: '/algorithms/3x3/oh-pll',
    puzzleId: '3x3',
    routeSlug: 'oh-pll',
    sourceLabel: 'JPerm OH PLL',
    sourceUrl: `${jpermBase}/algs/oh/pll`,
    title: '3x3 OH PLL',
  },
  {
    path: '/algorithms/2x2/oll',
    puzzleId: '2x2',
    routeSlug: 'oll',
    sourceLabel: 'JPerm 2x2 OLL',
    sourceUrl: `${jpermBase}/algs/2x2/oll`,
    title: '2x2 OLL',
  },
  {
    path: '/algorithms/2x2/pbl',
    puzzleId: '2x2',
    routeSlug: 'pbl',
    sourceLabel: 'JPerm 2x2 PBL',
    sourceUrl: `${jpermBase}/algs/2x2/pbl`,
    title: '2x2 PBL',
  },
  {
    path: '/algorithms/2x2/cll',
    puzzleId: '2x2',
    routeSlug: 'cll',
    sourceLabel: 'JPerm 2x2 CLL',
    sourceUrl: `${jpermBase}/algs/2x2/cll`,
    title: '2x2 CLL',
  },
  {
    path: '/algorithms/2x2/eg-1',
    puzzleId: '2x2',
    routeSlug: 'eg-1',
    sourceLabel: 'JPerm 2x2 EG-1',
    sourceUrl: `${jpermBase}/algs/2x2/eg-1`,
    title: '2x2 EG-1',
  },
  {
    path: '/algorithms/4x4/oll',
    puzzleId: '4x4',
    routeSlug: 'oll',
    sourceLabel: 'JPerm 4x4 OLL',
    sourceUrl: `${jpermBase}/algs/4x4/oll`,
    title: '4x4 OLL',
  },
  {
    path: '/algorithms/4x4/pll',
    puzzleId: '4x4',
    routeSlug: 'pll',
    sourceLabel: 'JPerm 4x4 PLL',
    sourceUrl: `${jpermBase}/algs/4x4/pll`,
    title: '4x4 PLL',
  },
]

export const algorithmSetSummaries: AlgorithmSetSummary[] = [
  ...jpermSetSummaries,
  ...speedCubeDbSetSummaries,
]

export function getAlgorithmPuzzle(puzzleId: string | undefined) {
  return algorithmPuzzles.find((puzzle) => puzzle.id === puzzleId)
}

export function getAlgorithmSetSummary(
  puzzleId: string | undefined,
  routeSlug: string | undefined,
) {
  return algorithmSetSummaries.find(
    (set) => set.puzzleId === puzzleId && set.routeSlug === routeSlug,
  )
}

export function setsForPuzzle(puzzleId: AlgorithmPuzzleId) {
  return algorithmSetSummaries.filter((set) => set.puzzleId === puzzleId)
}
