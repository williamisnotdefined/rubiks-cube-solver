import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Switch } from '../Switch'

const meta = {
  render: () => <SwitchStory />,
  title: 'Components/Switch',
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

function SwitchStory() {
  const [checked, setChecked] = useState(false)

  return (
    <label className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-app-text">
      <Switch aria-label="Inspection" checked={checked} onCheckedChange={setChecked} />
      Inspection
    </label>
  )
}
