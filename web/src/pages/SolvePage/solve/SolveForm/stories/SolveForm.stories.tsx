import type { Meta, StoryObj } from '@storybook/react-vite'
import { SolveForm } from '../SolveForm'
import { cube3MaxMovesLimit, scramblePlaceholder } from '../../constants'

const meta = {
  args: {
    buttonLoading: false,
    disabled: false,
    maxMovesInput: '20',
    maxMovesLimit: cube3MaxMovesLimit,
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
        supportedVisualizations: ['cube2-facelets-v1'],
      },
      {
        defaultMetric: 'htm',
        family: 'pyraminx',
        id: 'pyraminx',
        label: 'Pyraminx',
        scannerSupported: false,
        slug: 'pyraminx',
        status: 'planned',
        strategyIds: [],
        supportedInputs: [],
        supportedVisualizations: [],
      },
    ],
    scanAvailable: true,
    scramblePlaceholder,
    selectedPuzzleSlug: 'cube-3x3x3',
    onMaxMovesChange: () => undefined,
    onMaxNodesMillionChange: () => undefined,
    onNotationChange: () => undefined,
    onPuzzleChange: () => undefined,
    onScanClick: () => undefined,
    onSubmit: () => undefined,
  },
  component: SolveForm,
  title: 'SolvePage/SolveForm',
} satisfies Meta<typeof SolveForm>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}
