import {
  algorithmPuzzles,
  getAlgorithmPuzzle,
  getAlgorithmSetSummary,
  setsForPuzzle,
} from '../algorithmSetMetadata'
import type { AlgorithmCase, AlgorithmSet } from '../types'

export { algorithmPuzzles, getAlgorithmPuzzle, setsForPuzzle }

type AlgorithmCaseModule = Record<string, AlgorithmCase[]>

const algorithmCaseModules = import.meta.glob<AlgorithmCaseModule>([
  '../2x2/*/*.ts',
  '../3x3/*/*.ts',
  '../4x4/*/*.ts',
  '../5x5/*/*.ts',
  '../6x6/*/*.ts',
  '../megaminx/*/*.ts',
  '../pyraminx/*/*.ts',
  '../sq1/*/*.ts',
  '!../**/index.ts',
])

const modulePathBySetKey: Record<string, string> = {
  '2x2/cll': '../2x2/cll/cll.ts',
  '2x2/eg-1': '../2x2/egOne/egOne.ts',
  '2x2/eg-2': '../2x2/egTwo/egTwo.ts',
  '2x2/oll': '../2x2/oll/oll.ts',
  '2x2/pbl': '../2x2/pbl/pbl.ts',
  '3x3/2look-oll': '../3x3/twoLookOll/twoLookOll.ts',
  '3x3/2look-pll': '../3x3/twoLookPll/twoLookPll.ts',
  '3x3/advanced-f2l': '../3x3/advancedF2l/advancedF2l.ts',
  '3x3/coll': '../3x3/coll/coll.ts',
  '3x3/f2l': '../3x3/f2l/f2l.ts',
  '3x3/oh-oll': '../3x3/ohOll/ohOll.ts',
  '3x3/oh-pll': '../3x3/ohPll/ohPll.ts',
  '3x3/oll': '../3x3/oll/oll.ts',
  '3x3/pll': '../3x3/pll/pll.ts',
  '3x3/vls-no-edges': '../3x3/vlsNoEdges/vlsNoEdges.ts',
  '3x3/vls-ub': '../3x3/vlsUb/vlsUb.ts',
  '3x3/vls-ub-ul': '../3x3/vlsUbUl/vlsUbUl.ts',
  '3x3/vls-uf': '../3x3/vlsUf/vlsUf.ts',
  '3x3/vls-uf-ub': '../3x3/vlsUfUb/vlsUfUb.ts',
  '3x3/vls-uf-ul': '../3x3/vlsUfUl/vlsUfUl.ts',
  '3x3/vls-ul': '../3x3/vlsUl/vlsUl.ts',
  '3x3/winter-variation': '../3x3/winterVariation/winterVariation.ts',
  '3x3/zbll-antisune': '../3x3/zbllAntisune/zbllAntisune.ts',
  '3x3/zbll-h': '../3x3/zbllH/zbllH.ts',
  '3x3/zbll-l': '../3x3/zbllL/zbllL.ts',
  '3x3/zbll-pi': '../3x3/zbllPi/zbllPi.ts',
  '3x3/zbll-sune': '../3x3/zbllSune/zbllSune.ts',
  '3x3/zbll-t': '../3x3/zbllT/zbllT.ts',
  '3x3/zbll-u': '../3x3/zbllU/zbllU.ts',
  '4x4/oll': '../4x4/oll/oll.ts',
  '4x4/oll-parity': '../4x4/ollParity/ollParity.ts',
  '4x4/pll': '../4x4/pll/pll.ts',
  '4x4/pll-parity': '../4x4/pllParity/pllParity.ts',
  '5x5/l2c': '../5x5/l2c/l2c.ts',
  '5x5/l2e': '../5x5/l2e/l2e.ts',
  '6x6/l2c': '../6x6/l2c/l2c.ts',
  '6x6/l2e': '../6x6/l2e/l2e.ts',
  'megaminx/co': '../megaminx/co/co.ts',
  'megaminx/cp': '../megaminx/cp/cp.ts',
  'megaminx/eo': '../megaminx/eo/eo.ts',
  'megaminx/ep': '../megaminx/ep/ep.ts',
  'megaminx/oll': '../megaminx/oll/oll.ts',
  'megaminx/pll': '../megaminx/pll/pll.ts',
  'pyraminx/l3e': '../pyraminx/l3e/l3e.ts',
  'pyraminx/l4e': '../pyraminx/l4e/l4e.ts',
  'sq1/cp': '../sq1/cp/cp.ts',
  'sq1/cubeshape': '../sq1/cubeshape/cubeshape.ts',
  'sq1/ep': '../sq1/ep/ep.ts',
  'sq1/parity': '../sq1/parity/parity.ts',
}

export async function getAlgorithmSet(
  puzzleId: string | undefined,
  routeSlug: string | undefined,
): Promise<AlgorithmSet | undefined> {
  const summary = getAlgorithmSetSummary(puzzleId, routeSlug)

  if (summary === undefined) {
    return undefined
  }

  const modulePath = modulePathBySetKey[setKey(summary.puzzleId, summary.routeSlug)]
  const loadModule = algorithmCaseModules[modulePath]
  if (loadModule === undefined) {
    throw new Error(`Missing algorithm module for ${summary.title}`)
  }

  const module = await loadModule()
  const cases = Object.values(module).find(Array.isArray)
  if (cases === undefined) {
    throw new Error(`Missing algorithm cases for ${summary.title}`)
  }

  return { ...summary, cases: validateAlgorithmCases(cases, summary.title) }
}

export function validateAlgorithmCases(cases: AlgorithmCase[], setTitle: string): AlgorithmCase[] {
  for (const algorithmCase of cases) {
    const algorithm = algorithmCase.algorithm.trim()
    const containsMarkup = algorithm.includes('<') || algorithm.includes('>')
    const looksTruncated = /(?:\.{3}|…)\s*$/.test(algorithm)

    if (algorithm === '' || containsMarkup || looksTruncated) {
      throw new Error(`Invalid algorithm in ${setTitle}: ${algorithmCase.name}`)
    }
  }

  return cases
}

function setKey(puzzleId: string, routeSlug: string) {
  return `${puzzleId}/${routeSlug}`
}
