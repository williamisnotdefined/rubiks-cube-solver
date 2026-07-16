import type { AlgorithmCase } from '../../types'

export const pyraminxL3eCases: AlgorithmCase[] = [
  { name: 'Sune', image: '/algorithms/pyraminx/l3e/l3e-sune.png', algorithm: "R U R' U R U R'" },
  {
    name: 'AntiSune',
    image: '/algorithms/pyraminx/l3e/l3e-antisune.png',
    algorithm: "R' U' R U' R' U' R",
  },
  {
    name: 'Lefty Bars',
    image: '/algorithms/pyraminx/l3e/l3e-lefty-bars.png',
    algorithm: "R' U' L' U L R",
  },
  {
    name: 'Righty Bars',
    image: '/algorithms/pyraminx/l3e/l3e-righty-bars.png',
    algorithm: "U' R' L' U' L U R",
  },
  {
    name: '2 Flip',
    image: '/algorithms/pyraminx/l3e/l3e-2-flip.png',
    algorithm: "L R' L' R U' R U R'",
  },
]
