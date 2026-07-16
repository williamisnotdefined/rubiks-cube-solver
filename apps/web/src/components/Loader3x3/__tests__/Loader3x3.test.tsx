import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Loader3x3 } from '../Loader3x3'

const cubeMocks = vi.hoisted(() => {
  const mocks = {
    move: vi.fn((move: unknown) => {
      void move

      return Promise.resolve()
    }),
    register: vi.fn(),
    reset: vi.fn(),
  }

  mocks.register.mockImplementation(() => {
    if (!customElements.get('rubiks-cube')) {
      customElements.define(
        'rubiks-cube',
        class extends HTMLElement {
          move(move: unknown) {
            return mocks.move(move)
          }

          reset() {
            mocks.reset()
          }
        },
      )
    }
  })

  return mocks
})

vi.mock('@rubiks-cube-solver/rubiks-cube/view', () => ({
  RubiksCubeElement: { register: cubeMocks.register },
}))

describe('Loader3x3', () => {
  it('renders an accessible loading indicator by default', () => {
    render(<Loader3x3 />)

    expect(screen.getByLabelText('Loading')).toBeInTheDocument()
  })

  it('can be decorative inside labelled controls', () => {
    const { container } = render(<Loader3x3 decorative />)

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
  })

  it('renders the rubiks-cube custom element', async () => {
    const { container } = render(<Loader3x3 />)

    await waitFor(() => {
      expect(container.querySelector('rubiks-cube')).toBeInTheDocument()
    })
  })

  it('moves the rendered cube while mounted', async () => {
    cubeMocks.move.mockClear()
    cubeMocks.reset.mockClear()
    const { container } = render(<Loader3x3 />)

    await waitFor(() => {
      expect(container.querySelector('rubiks-cube')).toBeInTheDocument()
    })
    await waitFor(() => expect(cubeMocks.move).toHaveBeenCalled())
    expect(cubeMocks.reset).toHaveBeenCalled()
  })

  it('keeps explicit size overrides unambiguous', () => {
    const { container } = render(<Loader3x3 className='size-8' />)

    expect(container.firstElementChild).toHaveClass('size-8')
    expect(container.firstElementChild).not.toHaveClass('size-10')
  })
})
