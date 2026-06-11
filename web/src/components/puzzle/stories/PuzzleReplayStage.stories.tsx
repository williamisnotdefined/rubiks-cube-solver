import type { Meta, StoryObj } from '@storybook/react-vite'
import { PuzzleReplayStage } from '../PuzzleReplayStage'

const meta = {
  args: {
    active: true,
    alg: "R U R' U'",
    className: 'h-72 w-72',
    label: 'Puzzle replay',
    loadingLabel: 'Loading',
    puzzleSlug: 'cube-3x3x3',
    replaySupported: true,
    unavailableLabel: 'Visualization is not available for this puzzle yet.',
  },
  argTypes: {
    puzzleSlug: {
      control: 'select',
      options: [
        'cube-2x2x2',
        'cube-3x3x3',
        'cube-4x4x4',
        'cube-5x5x5',
        'cube-6x6x6',
        'cube-7x7x7',
        'megaminx',
        'pyraminx',
        'skewb',
        'square1',
        'clock',
      ],
    },
  },
  component: PuzzleReplayStage,
  title: 'Puzzle/PuzzleReplayStage',
} satisfies Meta<typeof PuzzleReplayStage>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}
