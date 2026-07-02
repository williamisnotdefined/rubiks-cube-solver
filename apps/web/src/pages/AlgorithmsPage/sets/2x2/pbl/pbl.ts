import type { AlgorithmCase } from '../../types'

export const twoByTwoPblCases: AlgorithmCase[] = [
  { name: "Adj/Adj", image: "/algorithms/2x2/pbl/2x2-pbl-adj-adj.png", algorithm: "R2 U' B2 U2 R2 U' R2" },
  { name: "Adj/Diag", image: "/algorithms/2x2/pbl/2x2-pbl-adj-diag.png", algorithm: "R U' R F2 R' U R'" },
  { name: "Diag/Diag", image: "/algorithms/2x2/pbl/2x2-pbl-diag-diag.png", algorithm: "R2 F2 R2" },
  { name: "Adj U", image: "/algorithms/2x2/pbl/2x2-pbl-adj-u.png", algorithm: "R U R' U' R' F R2 U' R' U' R U R' F'" },
  { name: "Diag U", image: "/algorithms/2x2/pbl/2x2-pbl-diag-u.png", algorithm: "F R U' R' U' R U R' F' R U R' U' R' F R F'" },
]
