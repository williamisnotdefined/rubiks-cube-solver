import type { Meta, StoryObj } from '@storybook/react-vite'
import { ScrambleViewer } from '../ScrambleViewer'

const meta = {
  args: {
    canGoPrevious: true,
    copied: false,
    eventLabel: '3x3x3',
    onCopy: () => undefined,
    onNext: () => undefined,
    onPrevious: () => undefined,
    onToggleReplay: () => undefined,
    replayOpen: false,
    scramble: "R2 D2 F2 D L2 F2 U' R2 D B2 L2 U' B' R' B' R2 B2 L B U'",
  },
  component: ScrambleViewer,
  title: 'Scramble/ScrambleViewer',
} satisfies Meta<typeof ScrambleViewer>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}
