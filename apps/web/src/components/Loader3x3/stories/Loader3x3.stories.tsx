import type { Meta, StoryObj } from '@storybook/react-vite'
import { Loader3x3 } from '..'

const meta = {
  args: {
    decorative: false,
    label: 'Loading',
  },
  component: Loader3x3,
  title: 'Components/Loader3x3',
} satisfies Meta<typeof Loader3x3>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}
