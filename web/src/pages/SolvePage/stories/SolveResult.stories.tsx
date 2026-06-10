import type { Meta, StoryObj } from '@storybook/react-vite'
import { SolveResult } from '../SolveResult'

const meta = {
  args: {
    error: null,
    result: {
      exploredNodes: 12_345,
      generatedTableStatus: 'available',
      length: 2,
      maxDepth: 20,
      maxNodes: 10_000_000,
      moves: ["U'", "R'"],
      ok: true,
      replayVerified: true,
      requestElapsedMs: 1_234,
      solverMode: 'generated_two_phase_quality',
      status: 'success',
      strategyId: 'generated-two-phase-quality',
      strategyLabel: 'Generated two-phase quality solver',
    },
    solving: false,
  },
  component: SolveResult,
  title: 'SolvePage/SolveResult',
} satisfies Meta<typeof SolveResult>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}
