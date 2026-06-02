import type { Meta, StoryObj } from '@storybook/react-vite'
import { TimerPage } from '../TimerPage'

const meta = {
  component: TimerPage,
  title: 'TimerPage/TimerPage',
} satisfies Meta<typeof TimerPage>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}
