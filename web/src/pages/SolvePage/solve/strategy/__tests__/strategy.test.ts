import { describe, expect, it } from 'vitest'
import { preferredStrategyId } from '../strategy'

describe('solve strategy selection', () => {
  it('uses the puzzle default strategy when available', () => {
    expect(
      preferredStrategyId(
        [
          {
            defaultMetric: 'htm',
            id: 'generated-two-phase',
            label: 'Generated',
            puzzleId: 'cube/3x3x3',
            solverMode: 'generated_two_phase',
            statusText: 'ready',
            supportedInputs: ['notation'],
            supportedMetrics: ['htm'],
          },
          {
            defaultMetric: 'htm',
            id: 'generated-two-phase-quality',
            label: 'Quality',
            puzzleId: 'cube/3x3x3',
            solverMode: 'generated_two_phase_quality',
            statusText: 'ready',
            supportedInputs: ['notation'],
            supportedMetrics: ['htm'],
          },
        ],
        {
          defaultMetric: 'htm',
          defaultStrategyId: 'generated-two-phase',
          family: 'cube',
          id: 'cube/3x3x3',
          label: '3x3x3 Cube',
          scannerSupported: true,
          slug: 'cube-3x3x3',
          status: 'stable',
          strategyIds: ['generated-two-phase', 'generated-two-phase-quality'],
          supportedInputs: ['notation'],
          supportedVisualizations: ['cube3-facelets-v1'],
        },
      ),
    ).toBe('generated-two-phase')
  })

  it('falls back to generated two-phase when quality is unavailable', () => {
    expect(preferredStrategyId([])).toBe('generated-two-phase')
    expect(preferredStrategyId(undefined)).toBe('generated-two-phase')
  })
})
