import type { AlgorithmSet } from '../types'
import { threeByThreeF2lCases } from '../3x3/f2l'
import { threeByThreeAdvancedF2lCases } from '../3x3/advancedF2l'
import { twoByTwoEgTwoCases } from '../2x2/egTwo'
import { threeByThreeZbllTCases } from '../3x3/zbllT'
import { threeByThreeZbllUCases } from '../3x3/zbllU'
import { threeByThreeZbllLCases } from '../3x3/zbllL'
import { threeByThreeZbllSuneCases } from '../3x3/zbllSune'
import { threeByThreeZbllAntisuneCases } from '../3x3/zbllAntisune'
import { threeByThreeZbllPiCases } from '../3x3/zbllPi'
import { threeByThreeZbllHCases } from '../3x3/zbllH'
import { threeByThreeVlsUbCases } from '../3x3/vlsUb'
import { threeByThreeVlsUbUlCases } from '../3x3/vlsUbUl'
import { threeByThreeVlsUfCases } from '../3x3/vlsUf'
import { threeByThreeVlsUfUbCases } from '../3x3/vlsUfUb'
import { threeByThreeVlsUfUlCases } from '../3x3/vlsUfUl'
import { threeByThreeVlsUlCases } from '../3x3/vlsUl'
import { threeByThreeVlsNoEdgesCases } from '../3x3/vlsNoEdges'
import { squareOneCubeshapeCases } from '../sq1/cubeshape'
import { squareOneCpCases } from '../sq1/cp'
import { squareOneEpCases } from '../sq1/ep'
import { squareOneParityCases } from '../sq1/parity'
import { pyraminxL4eCases } from '../pyraminx/l4e'
import { pyraminxL3eCases } from '../pyraminx/l3e'
import { megaminxOllCases } from '../megaminx/oll'
import { megaminxPllCases } from '../megaminx/pll'
import { megaminxEoCases } from '../megaminx/eo'
import { megaminxCoCases } from '../megaminx/co'
import { megaminxEpCases } from '../megaminx/ep'
import { megaminxCpCases } from '../megaminx/cp'
import { fourByFourOllParityCases } from '../4x4/ollParity'
import { fourByFourPllParityCases } from '../4x4/pllParity'
import { fiveByFiveL2eCases } from '../5x5/l2e'
import { fiveByFiveL2cCases } from '../5x5/l2c'
import { sixBySixL2eCases } from '../6x6/l2e'
import { sixBySixL2cCases } from '../6x6/l2c'

const speedCubeDbBase = 'https://speedcubedb.com'

export const speedCubeDbAlgorithmSets: AlgorithmSet[] = [
  { cases: threeByThreeF2lCases, path: "/algoritmos/3x3/f2l", puzzleId: "3x3", routeSlug: "f2l", sourceLabel: "SpeedCubeDB F2L", sourceUrl: `${speedCubeDbBase}/a/3x3/F2L`, title: "3x3 F2L" },
  { cases: threeByThreeAdvancedF2lCases, path: "/algoritmos/3x3/advanced-f2l", puzzleId: "3x3", routeSlug: "advanced-f2l", sourceLabel: "SpeedCubeDB Advanced F2L", sourceUrl: `${speedCubeDbBase}/a/3x3/AdvancedF2L`, title: "3x3 Advanced F2L" },
  { cases: twoByTwoEgTwoCases, path: "/algoritmos/2x2/eg-2", puzzleId: "2x2", routeSlug: "eg-2", sourceLabel: "SpeedCubeDB 2x2 EG-2", sourceUrl: `${speedCubeDbBase}/a/2x2/EG2`, title: "2x2 EG-2" },
  { cases: threeByThreeZbllTCases, path: "/algoritmos/3x3/zbll-t", puzzleId: "3x3", routeSlug: "zbll-t", sourceLabel: "SpeedCubeDB ZBLL T", sourceUrl: `${speedCubeDbBase}/a/3x3/ZBLLT`, title: "3x3 ZBLL T" },
  { cases: threeByThreeZbllUCases, path: "/algoritmos/3x3/zbll-u", puzzleId: "3x3", routeSlug: "zbll-u", sourceLabel: "SpeedCubeDB ZBLL U", sourceUrl: `${speedCubeDbBase}/a/3x3/ZBLLU`, title: "3x3 ZBLL U" },
  { cases: threeByThreeZbllLCases, path: "/algoritmos/3x3/zbll-l", puzzleId: "3x3", routeSlug: "zbll-l", sourceLabel: "SpeedCubeDB ZBLL L", sourceUrl: `${speedCubeDbBase}/a/3x3/ZBLLL`, title: "3x3 ZBLL L" },
  { cases: threeByThreeZbllSuneCases, path: "/algoritmos/3x3/zbll-sune", puzzleId: "3x3", routeSlug: "zbll-sune", sourceLabel: "SpeedCubeDB ZBLL Sune", sourceUrl: `${speedCubeDbBase}/a/3x3/ZBLLS`, title: "3x3 ZBLL Sune" },
  { cases: threeByThreeZbllAntisuneCases, path: "/algoritmos/3x3/zbll-antisune", puzzleId: "3x3", routeSlug: "zbll-antisune", sourceLabel: "SpeedCubeDB ZBLL Antisune", sourceUrl: `${speedCubeDbBase}/a/3x3/ZBLLAS`, title: "3x3 ZBLL Antisune" },
  { cases: threeByThreeZbllPiCases, path: "/algoritmos/3x3/zbll-pi", puzzleId: "3x3", routeSlug: "zbll-pi", sourceLabel: "SpeedCubeDB ZBLL Pi", sourceUrl: `${speedCubeDbBase}/a/3x3/ZBLLPi`, title: "3x3 ZBLL Pi" },
  { cases: threeByThreeZbllHCases, path: "/algoritmos/3x3/zbll-h", puzzleId: "3x3", routeSlug: "zbll-h", sourceLabel: "SpeedCubeDB ZBLL H", sourceUrl: `${speedCubeDbBase}/a/3x3/ZBLLH`, title: "3x3 ZBLL H" },
  { cases: threeByThreeVlsUbCases, path: "/algoritmos/3x3/vls-ub", puzzleId: "3x3", routeSlug: "vls-ub", sourceLabel: "SpeedCubeDB VLS UB", sourceUrl: `${speedCubeDbBase}/a/3x3/VLSUB`, title: "3x3 VLS UB" },
  { cases: threeByThreeVlsUbUlCases, path: "/algoritmos/3x3/vls-ub-ul", puzzleId: "3x3", routeSlug: "vls-ub-ul", sourceLabel: "SpeedCubeDB VLS UB UL", sourceUrl: `${speedCubeDbBase}/a/3x3/VLSUBUL`, title: "3x3 VLS UB UL" },
  { cases: threeByThreeVlsUfCases, path: "/algoritmos/3x3/vls-uf", puzzleId: "3x3", routeSlug: "vls-uf", sourceLabel: "SpeedCubeDB VLS UF", sourceUrl: `${speedCubeDbBase}/a/3x3/VLSUF`, title: "3x3 VLS UF" },
  { cases: threeByThreeVlsUfUbCases, path: "/algoritmos/3x3/vls-uf-ub", puzzleId: "3x3", routeSlug: "vls-uf-ub", sourceLabel: "SpeedCubeDB VLS UF UB", sourceUrl: `${speedCubeDbBase}/a/3x3/VLSUFUB`, title: "3x3 VLS UF UB" },
  { cases: threeByThreeVlsUfUlCases, path: "/algoritmos/3x3/vls-uf-ul", puzzleId: "3x3", routeSlug: "vls-uf-ul", sourceLabel: "SpeedCubeDB VLS UF UL", sourceUrl: `${speedCubeDbBase}/a/3x3/VLSUFUL`, title: "3x3 VLS UF UL" },
  { cases: threeByThreeVlsUlCases, path: "/algoritmos/3x3/vls-ul", puzzleId: "3x3", routeSlug: "vls-ul", sourceLabel: "SpeedCubeDB VLS UL", sourceUrl: `${speedCubeDbBase}/a/3x3/VLSUL`, title: "3x3 VLS UL" },
  { cases: threeByThreeVlsNoEdgesCases, path: "/algoritmos/3x3/vls-no-edges", puzzleId: "3x3", routeSlug: "vls-no-edges", sourceLabel: "SpeedCubeDB VLS No Edges", sourceUrl: `${speedCubeDbBase}/a/3x3/VLSNE`, title: "3x3 VLS No Edges" },
  { cases: squareOneCubeshapeCases, path: "/algoritmos/sq1/cubeshape", puzzleId: "sq1", routeSlug: "cubeshape", sourceLabel: "SpeedCubeDB Square-1 Cubeshape", sourceUrl: `${speedCubeDbBase}/a/SQ1/SQ1CS`, title: "Square-1 Cubeshape" },
  { cases: squareOneCpCases, path: "/algoritmos/sq1/cp", puzzleId: "sq1", routeSlug: "cp", sourceLabel: "SpeedCubeDB Square-1 CP", sourceUrl: `${speedCubeDbBase}/a/SQ1/SQ1CP`, title: "Square-1 CP" },
  { cases: squareOneEpCases, path: "/algoritmos/sq1/ep", puzzleId: "sq1", routeSlug: "ep", sourceLabel: "SpeedCubeDB Square-1 EP", sourceUrl: `${speedCubeDbBase}/a/SQ1/SQ1EP`, title: "Square-1 EP" },
  { cases: squareOneParityCases, path: "/algoritmos/sq1/parity", puzzleId: "sq1", routeSlug: "parity", sourceLabel: "SpeedCubeDB Square-1 Parity", sourceUrl: `${speedCubeDbBase}/a/SQ1/SQ1Parity`, title: "Square-1 Parity" },
  { cases: pyraminxL4eCases, path: "/algoritmos/pyraminx/l4e", puzzleId: "pyraminx", routeSlug: "l4e", sourceLabel: "SpeedCubeDB Pyraminx L4E", sourceUrl: `${speedCubeDbBase}/a/Pyraminx/L4E`, title: "Pyraminx L4E" },
  { cases: pyraminxL3eCases, path: "/algoritmos/pyraminx/l3e", puzzleId: "pyraminx", routeSlug: "l3e", sourceLabel: "SpeedCubeDB Pyraminx L3E", sourceUrl: `${speedCubeDbBase}/a/Pyraminx/L3E`, title: "Pyraminx L3E" },
  { cases: megaminxOllCases, path: "/algoritmos/megaminx/oll", puzzleId: "megaminx", routeSlug: "oll", sourceLabel: "SpeedCubeDB Megaminx OLL", sourceUrl: `${speedCubeDbBase}/a/Megaminx/MegaminxOLL`, title: "Megaminx OLL" },
  { cases: megaminxPllCases, path: "/algoritmos/megaminx/pll", puzzleId: "megaminx", routeSlug: "pll", sourceLabel: "SpeedCubeDB Megaminx PLL", sourceUrl: `${speedCubeDbBase}/a/Megaminx/MegaminxPLL`, title: "Megaminx PLL" },
  { cases: megaminxEoCases, path: "/algoritmos/megaminx/eo", puzzleId: "megaminx", routeSlug: "eo", sourceLabel: "SpeedCubeDB Megaminx EO", sourceUrl: `${speedCubeDbBase}/a/Megaminx/MegaminxEO`, title: "Megaminx EO" },
  { cases: megaminxCoCases, path: "/algoritmos/megaminx/co", puzzleId: "megaminx", routeSlug: "co", sourceLabel: "SpeedCubeDB Megaminx CO", sourceUrl: `${speedCubeDbBase}/a/Megaminx/MegaminxCO`, title: "Megaminx CO" },
  { cases: megaminxEpCases, path: "/algoritmos/megaminx/ep", puzzleId: "megaminx", routeSlug: "ep", sourceLabel: "SpeedCubeDB Megaminx EP", sourceUrl: `${speedCubeDbBase}/a/Megaminx/MegaminxEP`, title: "Megaminx EP" },
  { cases: megaminxCpCases, path: "/algoritmos/megaminx/cp", puzzleId: "megaminx", routeSlug: "cp", sourceLabel: "SpeedCubeDB Megaminx CP", sourceUrl: `${speedCubeDbBase}/a/Megaminx/MegaminxCP`, title: "Megaminx CP" },
  { cases: fourByFourOllParityCases, path: "/algoritmos/4x4/oll-parity", puzzleId: "4x4", routeSlug: "oll-parity", sourceLabel: "SpeedCubeDB 4x4 OLL Parity", sourceUrl: `${speedCubeDbBase}/a/4x4/OLLParity`, title: "4x4 OLL Parity" },
  { cases: fourByFourPllParityCases, path: "/algoritmos/4x4/pll-parity", puzzleId: "4x4", routeSlug: "pll-parity", sourceLabel: "SpeedCubeDB 4x4 PLL Parity", sourceUrl: `${speedCubeDbBase}/a/4x4/PLLParity`, title: "4x4 PLL Parity" },
  { cases: fiveByFiveL2eCases, path: "/algoritmos/5x5/l2e", puzzleId: "5x5", routeSlug: "l2e", sourceLabel: "SpeedCubeDB 5x5 L2E", sourceUrl: `${speedCubeDbBase}/a/5x5/L2E`, title: "5x5 L2E" },
  { cases: fiveByFiveL2cCases, path: "/algoritmos/5x5/l2c", puzzleId: "5x5", routeSlug: "l2c", sourceLabel: "SpeedCubeDB 5x5 L2C", sourceUrl: `${speedCubeDbBase}/a/5x5/L2C`, title: "5x5 L2C" },
  { cases: sixBySixL2eCases, path: "/algoritmos/6x6/l2e", puzzleId: "6x6", routeSlug: "l2e", sourceLabel: "SpeedCubeDB 6x6 L2E", sourceUrl: `${speedCubeDbBase}/a/6x6/6x6L2E`, title: "6x6 L2E" },
  { cases: sixBySixL2cCases, path: "/algoritmos/6x6/l2c", puzzleId: "6x6", routeSlug: "l2c", sourceLabel: "SpeedCubeDB 6x6 L2C", sourceUrl: `${speedCubeDbBase}/a/6x6/6x6L2C`, title: "6x6 L2C" },
]
