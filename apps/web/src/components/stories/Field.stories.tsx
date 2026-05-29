import type { Meta, StoryObj } from '@storybook/react-vite'
import { Field } from '../Field'
import { TextInput } from '../FormControls'

const meta = {
  args: {
    children: null,
    label: 'Scramble',
  },
  component: Field,
  render: (args) => (
    <Field {...args}>
      <TextInput aria-label={args.label} placeholder="R U R'" />
    </Field>
  ),
  title: 'Components/Field',
} satisfies Meta<typeof Field>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}
