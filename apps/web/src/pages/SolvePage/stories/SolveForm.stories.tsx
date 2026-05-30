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
    scramblePlaceholder,
    onMaxMovesChange: () => undefined,
    onMaxNodesMillionChange: () => undefined,
    onNotationChange: () => undefined,
    onScanClick: () => undefined,
    onSubmit: (event) => event.preventDefault(),
  },
  component: SolveForm,
  title: 'SolvePage/SolveForm',
} satisfies Meta<typeof SolveForm>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}
