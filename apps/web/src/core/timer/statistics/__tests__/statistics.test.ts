import { describe, expect, it } from 'vitest'
import { averageOf, bestTimeMs, meanTimeMs, solveTimeMs } from '../statistics'
import type { TimedSolve } from '../statistics'

describe('timer statistics', () => {
  it('applies solve penalties', () => {
    expect(solveTimeMs(solve(10_000, 'ok'))).toBe(10_000)
    expect(solveTimeMs(solve(10_000, 'plus2'))).toBe(12_000)
    expect(solveTimeMs(solve(10_000, 'dnf'))).toBeNull()
  })

  it('calculates best and mean from valid solves', () => {
    const solves = [solve(10_000), solve(12_000, 'plus2'), solve(8_000), solve(7_000, 'dnf')]

    expect(bestTimeMs(solves)).toBe(8_000)
    expect(meanTimeMs(solves)).toBe(10_667)
  })

  it('calculates an average by trimming best and worst', () => {
    const solves = [solve(10_000), solve(12_000), solve(9_000), solve(11_000), solve(8_000)]

    expect(averageOf(solves, 5).timeMs).toBe(10_000)
  })

  it('treats one DNF as the trimmed worst and two DNFs as DNF average', () => {
    expect(
      averageOf([solve(10_000), solve(12_000), solve(9_000), solve(11_000), solve(8_000, 'dnf')], 5)
        .timeMs,
    ).toBe(11_000)
    expect(
      averageOf(
        [solve(10_000), solve(12_000), solve(9_000), solve(11_000, 'dnf'), solve(8_000, 'dnf')],
        5,
      ).timeMs,
    ).toBeNull()
  })
})

function solve(rawTimeMs: number, penalty: TimedSolve['penalty'] = 'ok'): TimedSolve {
  return { penalty, rawTimeMs }
}
