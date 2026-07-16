import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '..'

const meta = {
  render: () => <SelectStory />,
  title: 'Components/Select',
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

function SelectStory() {
  const [value, setValue] = useState('10')

  return (
    <Select value={value} onValueChange={setValue}>
      <SelectTrigger aria-label='Max nodes (M)' className='max-w-56'>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='10'>10</SelectItem>
        <SelectItem value='15'>15</SelectItem>
        <SelectItem value='20'>20</SelectItem>
        <SelectItem value='25'>25</SelectItem>
      </SelectContent>
    </Select>
  )
}
