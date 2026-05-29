import type { Meta, StoryObj } from '@storybook/react-vite'
import { TextInput } from '../FormControls'

const meta = {
  args: {
    'aria-label': 'Scramble',
    placeholder: "R2 D2 F2 D L2 F2 U' R2 D B2 L2 U' B' R' B' R2 B2 L B U'",
    value: '',
  },
  component: TextInput,
  title: 'Components/TextInput',
} satisfies Meta<typeof TextInput>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}
