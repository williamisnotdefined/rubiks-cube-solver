import type { Meta, StoryObj } from '@storybook/react-vite'
import { AverageCards } from '../AverageCards'

const meta = {
  args: {
    cards: [
      { label: 'best', timeMs: 8_420 },
      { label: 'mean', timeMs: 11_231 },
      { label: 'ao5', timeMs: 10_114 },
      { label: 'ao12', timeMs: null },
    ],
    showMilliseconds: false,
  },
  component: AverageCards,
  title: 'Timer/AverageCards',
} satisfies Meta<typeof AverageCards>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}
