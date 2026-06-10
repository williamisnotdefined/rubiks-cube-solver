import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '../Button'

const meta = {
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost'],
    },
  },
  args: {
    children: 'Solve',
    disabled: false,
    type: 'button',
    variant: 'primary',
  },
  component: Button,
  title: 'Components/Button',
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}
