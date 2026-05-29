import type { Meta, StoryObj } from '@storybook/react-vite'
import { SolutionPlayback } from '../SolutionPlayback'

const meta = {
  args: {
    moves: ["U'", "R'"],
    step: 0,
    onStepChange: () => undefined,
  },
  component: SolutionPlayback,
  title: 'SolvePage/SolutionPlayback',
} satisfies Meta<typeof SolutionPlayback>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}
