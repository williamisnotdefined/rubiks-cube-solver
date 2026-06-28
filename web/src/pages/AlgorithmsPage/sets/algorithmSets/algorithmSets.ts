import { twoByTwoCllCases } from '../2x2/cll'
import { twoByTwoEgOneCases } from '../2x2/egOne'
import { twoByTwoOllCases } from '../2x2/oll'
import { twoByTwoPblCases } from '../2x2/pbl'
import { threeByThreeCollCases } from '../3x3/coll'
import { threeByThreeOhOllCases } from '../3x3/ohOll'
import { threeByThreeOhPllCases } from '../3x3/ohPll'
import { threeByThreeOllCases } from '../3x3/oll'
import { threeByThreePllCases } from '../3x3/pll'
import { threeByThreeTwoLookOllCases } from '../3x3/twoLookOll'
import { threeByThreeTwoLookPllCases } from '../3x3/twoLookPll'
import { threeByThreeWinterVariationCases } from '../3x3/winterVariation'
import { fourByFourOllCases } from '../4x4/oll'
import { fourByFourPllCases } from '../4x4/pll'
import { algorithmPuzzles, getAlgorithmPuzzle, jpermSetSummaries, setsForPuzzle } from '../algorithmSetMetadata'
import { speedCubeDbAlgorithmSets } from '../speedCubeDbSets'
import type { AlgorithmCase, AlgorithmSet, AlgorithmSetSummary } from '../types'

export { algorithmPuzzles, getAlgorithmPuzzle, setsForPuzzle }

const jpermCasesByKey: Record<string, AlgorithmCase[]> = {
  '2x2/cll': twoByTwoCllCases,
  '2x2/eg-1': twoByTwoEgOneCases,
  '2x2/oll': twoByTwoOllCases,
  '2x2/pbl': twoByTwoPblCases,
  '3x3/2look-oll': threeByThreeTwoLookOllCases,
  '3x3/2look-pll': threeByThreeTwoLookPllCases,
  '3x3/coll': threeByThreeCollCases,
  '3x3/oh-oll': threeByThreeOhOllCases,
  '3x3/oh-pll': threeByThreeOhPllCases,
  '3x3/oll': threeByThreeOllCases,
  '3x3/pll': threeByThreePllCases,
  '3x3/winter-variation': threeByThreeWinterVariationCases,
  '4x4/oll': fourByFourOllCases,
  '4x4/pll': fourByFourPllCases,
}

const jpermAlgorithmSets = jpermSetSummaries.map(withCases)

export const algorithmSets: AlgorithmSet[] = [
  ...jpermAlgorithmSets,
  ...speedCubeDbAlgorithmSets,
]

export function getAlgorithmSet(puzzleId: string | undefined, routeSlug: string | undefined) {
  return algorithmSets.find((set) => set.puzzleId === puzzleId && set.routeSlug === routeSlug)
}

function withCases(summary: AlgorithmSetSummary): AlgorithmSet {
  const cases = jpermCasesByKey[setKey(summary)]

  if (cases === undefined) {
    throw new Error(`Missing JPerm cases for ${summary.title}`)
  }

  return { ...summary, cases }
}

function setKey(set: AlgorithmSetSummary) {
  return `${set.puzzleId}/${set.routeSlug}`
}
