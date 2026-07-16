import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Checkbox } from '..'

const meta = {
  render: () => <CheckboxStory />,
  title: 'Components/Checkbox',
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

function CheckboxStory() {
  const [checked, setChecked] = useState(false)

  return (
    <label className='flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-app-text'>
      <Checkbox
        aria-label='Use inspection'
        checked={checked}
        onCheckedChange={(nextChecked) => setChecked(nextChecked === true)}
      />
      Use inspection
    </label>
  )
}
