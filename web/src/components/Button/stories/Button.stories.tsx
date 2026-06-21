import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '..'

const meta = {
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost'],
    },
    size: {
      control: 'select',
      options: ['md', 'sm'],
    },
  },
  args: {
    children: 'Solve',
    disabled: false,
    size: 'md',
    type: 'button',
    variant: 'primary',
  },
  component: Button,
  title: 'Components/Button',
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}
