import type { Meta, StoryObj } from '@storybook/react-vite'
import { LoadingIndicator } from '../LoadingIndicator'

const meta = {
  args: {
    decorative: false,
    label: 'Loading',
  },
  component: LoadingIndicator,
  title: 'Components/LoadingIndicator',
} satisfies Meta<typeof LoadingIndicator>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}
