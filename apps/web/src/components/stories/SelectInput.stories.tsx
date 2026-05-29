import type { Meta, StoryObj } from '@storybook/react-vite'
import { SelectInput } from '../FormControls'

const meta = {
  args: {
    'aria-label': 'Max nodes (M)',
    value: '10',
  },
  component: SelectInput,
  render: (args) => (
    <SelectInput {...args}>
      <option value="10">10</option>
      <option value="15">15</option>
      <option value="20">20</option>
      <option value="25">25</option>
    </SelectInput>
  ),
  title: 'Components/SelectInput',
} satisfies Meta<typeof SelectInput>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}
