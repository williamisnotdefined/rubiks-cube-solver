import { createRef } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CubeStage } from '../CubeStage'

const register = vi.hoisted(() =>
  vi.fn(() => {
    if (!customElements.get('rubiks-cube')) {
      customElements.define('rubiks-cube', class extends HTMLElement {})
    }
  }),
)

vi.mock('@rubiks-cube-solver/rubiks-cube/view', () => ({
  RubiksCubeElement: { register },
}))

describe('CubeStage', () => {
  it('keeps the cube custom element unmounted while inactive', () => {
    register.mockClear()
    const onReady = vi.fn()

    render(
      <CubeStage
        active={false}
        cubeType="Three"
        cubeRef={createRef()}
        onReady={onReady}
      />,
    )

    expect(screen.getByLabelText('Cube visualization').querySelector('rubiks-cube')).toBeNull()
    expect(register).not.toHaveBeenCalled()
    expect(onReady).not.toHaveBeenCalled()
  })

  it('registers and renders the cube custom element', async () => {
    const onReady = vi.fn()

    render(
      <CubeStage
        active
        cubeType="Three"
        cubeRef={createRef()}
        onReady={onReady}
      />,
    )

    await waitFor(() =>
      expect(screen.getByLabelText('Cube visualization')).toContainHTML('rubiks-cube'),
    )
    expect(
      screen.getByLabelText('Cube visualization').querySelector('rubiks-cube'),
    ).toHaveAttribute('cube-type', 'Three')
    await waitFor(() => expect(onReady).toHaveBeenCalled())
  })

  it('renders the 2x2 cube custom element when requested', async () => {
    const onReady = vi.fn()

    render(
      <CubeStage
        active
        cubeType="Two"
        cubeRef={createRef()}
        onReady={onReady}
      />,
    )

    await waitFor(() =>
      expect(screen.getByLabelText('Cube visualization')).toContainHTML('rubiks-cube'),
    )
    expect(
      screen.getByLabelText('Cube visualization').querySelector('rubiks-cube'),
    ).toHaveAttribute('cube-type', 'Two')
  })

  it('uses the already registered element without registering again', async () => {
    register.mockClear()
    const onReady = vi.fn()

    render(
      <CubeStage
        active
        cubeType="Three"
        cubeRef={createRef()}
        onReady={onReady}
      />,
    )

    await waitFor(() =>
      expect(screen.getByLabelText('Cube visualization')).toContainHTML('rubiks-cube'),
    )
    expect(register).not.toHaveBeenCalled()
    expect(onReady).toHaveBeenCalled()
  })

  it('removes and restores the cube custom element when activity changes', async () => {
    const onReady = vi.fn()
    const { rerender } = render(
      <CubeStage
        active
        cubeType="Three"
        cubeRef={createRef()}
        onReady={onReady}
      />,
    )

    await waitFor(() =>
      expect(screen.getByLabelText('Cube visualization')).toContainHTML('rubiks-cube'),
    )

    rerender(
      <CubeStage
        active={false}
        cubeType="Three"
        cubeRef={createRef()}
        onReady={onReady}
      />,
    )

    expect(screen.getByLabelText('Cube visualization').querySelector('rubiks-cube')).toBeNull()

    rerender(
      <CubeStage
        active
        cubeType="Three"
        cubeRef={createRef()}
        onReady={onReady}
      />,
    )

    await waitFor(() =>
      expect(screen.getByLabelText('Cube visualization')).toContainHTML('rubiks-cube'),
    )
    expect(onReady).toHaveBeenCalledTimes(2)
  })
})
