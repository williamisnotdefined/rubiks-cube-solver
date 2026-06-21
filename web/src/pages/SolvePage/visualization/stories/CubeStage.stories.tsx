import type { RefObject } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { RubiksCubeElement } from '@rubiks-cube-solver/rubiks-cube/view'
import { CubeStage } from '../CubeStage'

const cubeRef = { current: null } as RefObject<RubiksCubeElement | null>

const meta = {
  args: {
    active: true,
    cubeType: 'Three',
    cubeRef,
    onReady: () => undefined,
  },
  component: CubeStage,
  title: 'SolvePage/CubeStage',
} satisfies Meta<typeof CubeStage>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}
