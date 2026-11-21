import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CursorLayer } from '../CursorLayer'

describe('CursorLayer', () => {
  it('renders the custom cursor elements', () => {
    const { container } = render(<CursorLayer />)

    expect(container.querySelector('.cursor-layer')).toBeInTheDocument()
    expect(container.querySelector('.cursor-square')).toBeInTheDocument()
    expect(container.querySelector('.cursor-ring')).toBeInTheDocument()
  })
})
