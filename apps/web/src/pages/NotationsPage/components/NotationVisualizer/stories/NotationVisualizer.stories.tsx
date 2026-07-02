import type { Meta, StoryObj } from '@storybook/react-vite'
import { notationGuides } from '../../../notationGuides'
import { NotationVisualizer } from '../NotationVisualizer'

const meta = {
  args: {
    guide: notationGuides[1],
  },
  component: NotationVisualizer,
  title: 'NotationsPage/NotationVisualizer',
} satisfies Meta<typeof NotationVisualizer>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}
