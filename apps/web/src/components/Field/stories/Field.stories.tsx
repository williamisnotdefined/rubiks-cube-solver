import type { Meta, StoryObj } from '@storybook/react-vite'
import { TextInput } from '@components/FormControls'
import { Field } from '..'

const meta = {
  args: {
    children: null,
    description: 'Use standard move notation.',
    error: undefined,
    label: 'Scramble',
  },
  component: Field,
  render: (args) => (
    <Field {...args} controlId='story-scramble'>
      <TextInput id='story-scramble' placeholder="R U R'" />
    </Field>
  ),
  title: 'Components/Field',
} satisfies Meta<typeof Field>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}
