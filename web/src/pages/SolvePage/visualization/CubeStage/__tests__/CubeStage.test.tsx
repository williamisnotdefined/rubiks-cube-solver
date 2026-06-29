import { createRef } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
  it('registers and renders the cube custom element', async () => {
    const onReady = vi.fn()

    render(
      <CubeStage
        cubeType="Three"
        cubeRef={createRef()}
        loadRequested
        onReady={onReady}
        onLoadRequest={vi.fn()}
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
        cubeType="Two"
        cubeRef={createRef()}
        loadRequested
        onReady={onReady}
        onLoadRequest={vi.fn()}
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
        cubeType="Three"
        cubeRef={createRef()}
        loadRequested
        onReady={onReady}
        onLoadRequest={vi.fn()}
      />,
    )

    await waitFor(() =>
      expect(screen.getByLabelText('Cube visualization')).toContainHTML('rubiks-cube'),
    )
    expect(register).not.toHaveBeenCalled()
    expect(onReady).toHaveBeenCalled()
  })

  it('renders a lightweight preparing control before the cube is requested', async () => {
    const user = userEvent.setup()
    const onLoadRequest = vi.fn()

    render(
      <CubeStage
        cubeType="Three"
        cubeRef={createRef()}
        loadRequested={false}
        onReady={vi.fn()}
        onLoadRequest={onLoadRequest}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Preparing cube' }))

    expect(register).not.toHaveBeenCalled()
    expect(onLoadRequest).toHaveBeenCalled()
  })

})
