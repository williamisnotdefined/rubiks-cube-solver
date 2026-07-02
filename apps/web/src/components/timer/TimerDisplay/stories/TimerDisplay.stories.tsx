import type { Meta, StoryObj } from '@storybook/react-vite'
import { TimerDisplay } from '..'

const meta = {
  argTypes: {
    status: {
      control: 'select',
      options: ['idle', 'holding', 'ready', 'inspection', 'running', 'stopped'],
    },
  },
  args: {
    elapsedMs: 12_345,
    showMilliseconds: false,
    status: 'idle',
  },
  component: TimerDisplay,
  title: 'Timer/TimerDisplay',
} satisfies Meta<typeof TimerDisplay>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}
