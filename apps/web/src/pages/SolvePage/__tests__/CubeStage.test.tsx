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

vi.mock('@houstonp/rubiks-cube/view', () => ({
  RubiksCubeElement: { register },
}))

describe('CubeStage', () => {
  it('registers and renders the cube custom element', async () => {
    const onReady = vi.fn()

    render(<CubeStage cubeRef={createRef()} onReady={onReady} />)

    await waitFor(() => expect(screen.getByLabelText('Cube visualization')).toContainHTML('rubiks-cube'))
    await waitFor(() => expect(onReady).toHaveBeenCalled())
  })

  it('uses the already registered element without registering again', async () => {
    register.mockClear()
    const onReady = vi.fn()

    render(<CubeStage cubeRef={createRef()} onReady={onReady} />)

    await waitFor(() => expect(screen.getByLabelText('Cube visualization')).toContainHTML('rubiks-cube'))
    expect(register).not.toHaveBeenCalled()
    expect(onReady).toHaveBeenCalled()
  })
})
