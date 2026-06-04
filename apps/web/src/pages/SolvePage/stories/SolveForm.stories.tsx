import type { Meta, StoryObj } from '@storybook/react-vite'
import { SolveForm } from '../SolveForm'
import { scramblePlaceholder } from '../constants'

const meta = {
  args: {
    buttonLoading: false,
    disabled: false,
    maxMovesInput: '20',
    maxNodesInvalid: false,
    maxNodesMillionInput: '10',
    notation: '',
    puzzleOptions: [
      {
        defaultMetric: 'htm',
        defaultStrategyId: 'generated-two-phase-quality',
        family: 'cube',
        id: 'cube/3x3x3',
        label: '3x3x3 Cube',
        scannerSupported: true,
        slug: 'cube-3x3x3',
        status: 'stable',
        strategyIds: ['generated-two-phase-quality'],
        supportedInputs: ['notation'],
        supportedVisualizations: ['cube3-facelets-v1'],
      },
      {
        defaultMetric: 'htm',
        defaultStrategyId: 'cube2-pdb-ida-star',
        family: 'cube',
        id: 'cube/2x2x2',
        label: '2x2x2 Cube',
        scannerSupported: false,
        slug: 'cube-2x2x2',
        status: 'experimental',
        strategyIds: ['cube2-pdb-ida-star'],
        supportedInputs: ['notation'],
        supportedVisualizations: ['none'],
      },
    ],
    scanAvailable: true,
    scramblePlaceholder,
    selectedPuzzleSlug: 'cube-3x3x3',
    selectedStrategyId: 'generated-two-phase-quality',
    strategyOptions: [
      {
        defaultMetric: 'htm',
        id: 'generated-two-phase-quality',
        label: 'Generated two-phase quality solver',
        puzzleId: 'cube/3x3x3',
        solverMode: 'generated_two_phase_quality',
        statusText: 'ready',
        supportedInputs: ['notation'],
        supportedMetrics: ['htm'],
      },
    ],
    onMaxMovesChange: () => undefined,
    onMaxNodesMillionChange: () => undefined,
    onNotationChange: () => undefined,
    onPuzzleChange: () => undefined,
    onScanClick: () => undefined,
    onStrategyChange: () => undefined,
    onSubmit: (event) => event.preventDefault(),
  },
  component: SolveForm,
  title: 'SolvePage/SolveForm',
} satisfies Meta<typeof SolveForm>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}
