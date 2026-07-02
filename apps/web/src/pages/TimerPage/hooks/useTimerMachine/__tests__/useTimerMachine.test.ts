import { describe, expect, it } from 'vitest'
import { inspectionPenaltyForElapsed } from '../useTimerMachine'

describe('inspectionPenaltyForElapsed', () => {
  it('applies WCA inspection penalty thresholds', () => {
    expect(inspectionPenaltyForElapsed(14_999)).toBe('ok')
    expect(inspectionPenaltyForElapsed(15_000)).toBe('plus2')
    expect(inspectionPenaltyForElapsed(16_999)).toBe('plus2')
    expect(inspectionPenaltyForElapsed(17_000)).toBe('dnf')
  })
})
