import type { AlgorithmCase } from '../../types'

export const threeByThreeTwoLookPllCases: AlgorithmCase[] = [
  { name: "Diagonal", image: "/algorithms/3x3/2look-pll/2look-pll-diagonal.png", algorithm: "F R U' R' U' R U R' F' R U R' U' R' F R F'" },
  { name: "Headlights", image: "/algorithms/3x3/2look-pll/2look-pll-headlights.png", algorithm: "R U R' U' R' F R2 U' R' U' R U R' F'" },
  { name: "PLL (H)", image: "/algorithms/3x3/2look-pll/2look-pll-pll-h.png", algorithm: "M2 U M2 U2 M2 U M2" },
  { name: "PLL (Ua)", image: "/algorithms/3x3/2look-pll/2look-pll-pll-ua.png", algorithm: "R U' R U R U R U' R' U' R2" },
  { name: "PLL (Ub)", image: "/algorithms/3x3/2look-pll/2look-pll-pll-ub.png", algorithm: "R2 U R U R' U' R' U' R' U R'" },
  { name: "PLL (Z)", image: "/algorithms/3x3/2look-pll/2look-pll-pll-z.png", algorithm: "M' U M2 U M2 U M' U2 M2" },
]
